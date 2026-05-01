import { createClient } from '@supabase/supabase-js';

const BASE_URL = 'https://publicapi.markettime.com/mtpublic/api/v1';
const PAGE_SIZE = 250;

const requiredEnv = [
  'MT_API_KEY',
  'MT_REP_GROUP_ID',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function mtFetch(path, options = {}, attempts = 4) {
  let lastError;
  const url = `${BASE_URL}/${process.env.MT_REP_GROUP_ID}${path}`;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'x-api-key': process.env.MT_API_KEY,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`MarketTime API error ${res.status}: ${text.slice(0, 300)}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(`MarketTime error: ${data.error?.message ?? 'Unknown error'}`);
      }

      return data.response;
    } catch (err) {
      lastError = err;
      if (attempt === attempts) break;
      await sleep(1000 * attempt);
    }
  }

  throw lastError;
}

async function fetchAllCustomers() {
  const customers = [];
  let offset = 0;

  while (true) {
    const response = await mtFetch(
      `/customers/get?offset=${offset}&recordSize=${PAGE_SIZE}`,
      {
        method: 'POST',
        // MarketTime expects an array of QueryFilter objects. Empty array returns
        // the page of customers without filtering.
        body: JSON.stringify([]),
      }
    );

    const records = Array.isArray(response) ? response : response?.records ?? [];
    if (records.length === 0) break;

    customers.push(...records);
    console.log(`Fetched customer page offset ${offset} (${records.length}); total ${customers.length}`);

    if (records.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return customers;
}

async function fetchAllUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    users.push(...(data.users ?? []));
    if (!data.users?.length || data.users.length < 1000) break;
    page += 1;
  }

  return users;
}

function isApprovedCustomer(customer) {
  // MarketTime exposes several status flags. Treat a customer as portal-approved
  // only when the repgroup has approved it and it is active.
  return (
    customer.active !== false &&
    customer.status !== 'INACTIVE' &&
    customer.recordDeleted !== true &&
    (customer.approvedByRepGroup === true || customer.approved === true)
  );
}

async function main() {
  console.log('Syncing MarketTime customer approvals to Supabase profiles...');

  const [customers, users] = await Promise.all([
    fetchAllCustomers(),
    fetchAllUsers(),
  ]);

  const customersByEmail = new Map();
  for (const customer of customers) {
    const email = customer.email?.trim().toLowerCase();
    if (!email || !customer.recordID) continue;

    // Prefer approved records if MarketTime has duplicate email rows.
    const existing = customersByEmail.get(email);
    if (!existing || (!isApprovedCustomer(existing) && isApprovedCustomer(customer))) {
      customersByEmail.set(email, customer);
    }
  }

  let matched = 0;
  let linked = 0;
  let unmatched = 0;

  for (const user of users) {
    const email = user.email?.trim().toLowerCase();
    if (!email) continue;

    const customer = customersByEmail.get(email);
    if (!customer) {
      unmatched += 1;
      continue;
    }

    matched += 1;
    const approved = isApprovedCustomer(customer);

    const { error } = await db
      .from('profiles')
      .upsert({
        id: user.id,
        retailer_id: customer.recordID,
        company_name: customer.name ?? customer.dba ?? null,
        approved,
      }, { onConflict: 'id' });

    if (error) throw error;
    linked += 1;
  }

  console.log('\nCustomer sync summary:');
  console.log(JSON.stringify({
    marketTimeCustomers: customers.length,
    supabaseUsers: users.length,
    matchedByEmail: matched,
    linkedProfiles: linked,
    unmatchedUsers: unmatched,
  }, null, 2));
}

main().catch((err) => {
  console.error('Customer sync failed:', err);
  process.exit(1);
});
