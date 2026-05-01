import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

const BASE_URL = 'https://publicapi.markettime.com/mtpublic/api/v1';
const PAGE_SIZE = 250;

function isApprovedCustomer(customer) {
  return (
    customer.active !== false &&
    customer.status !== 'INACTIVE' &&
    customer.recordDeleted !== true &&
    (customer.approvedByRepGroup === true || customer.approved === true)
  );
}

async function fetchCustomersPage(offset) {
  const res = await fetch(
    `${BASE_URL}/${process.env.MT_REP_GROUP_ID}/customers/get?offset=${offset}&recordSize=${PAGE_SIZE}`,
    {
      method: 'POST',
      headers: {
        'x-api-key': process.env.MT_API_KEY,
        'Content-Type': 'application/json',
      },
      // MarketTime expects an array of QueryFilter objects. Empty array returns
      // the page of customers without filtering.
      body: JSON.stringify([]),
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    throw new Error(`MarketTime customer lookup failed: ${res.status}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.error?.message ?? 'MarketTime customer lookup failed');
  }

  return Array.isArray(data.response) ? data.response : data.response?.records ?? [];
}

async function findCustomerByEmail(email) {
  const target = email.trim().toLowerCase();
  let offset = 0;

  while (true) {
    const customers = await fetchCustomersPage(offset);
    if (customers.length === 0) return null;

    const match = customers.find((customer) => customer.email?.trim().toLowerCase() === target);
    if (match) return match;

    if (customers.length < PAGE_SIZE) return null;
    offset += PAGE_SIZE;
  }
}

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customer = await findCustomerByEmail(session.user.email);

  if (!customer) {
    return NextResponse.json({
      linked: false,
      reason: 'not_found',
      message: 'No matching MarketTime customer was found for this email.',
    });
  }

  const approved = isApprovedCustomer(customer);
  const admin = createAdminClient();

  const { error } = await admin
    .from('profiles')
    .upsert({
      id: session.user.id,
      retailer_id: customer.recordID,
      company_name: customer.name ?? customer.dba ?? null,
      approved,
    }, { onConflict: 'id' });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    linked: true,
    approved,
    retailerID: customer.recordID,
  });
}
