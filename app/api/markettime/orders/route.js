import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createOrder } from '@/lib/markettime';
import { NextResponse } from 'next/server';

const BLOCKED_FIELDS = [
  'retailerContactID', 'retailerContact', 'publicOrderID', 'orderType',
  'externalID2', 'manufacturerOrderNumber', 'origin', 'salespersonGroupID',
  'orderPaymentTokens', 'orderPayments', 'recordID', 'dateAdded',
  'dateModified', 'userAdded', 'userModified', 'recordDeleted',
];

/**
 * POST /api/markettime/orders
 * Creates a new MarketTime order on behalf of the authenticated customer.
 * Always injects: repGroupID, salespersonOrderWriterID, salespersonAssignedID,
 * salespersonIDToPay, paymentTerm, specialInstructions, manufacturerOrderStatus.
 * Strips all blocked fields before forwarding to MT.
 */
export async function POST(request) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, approved')
    .eq('id', session.user.id)
    .single();

  if (!profile?.retailer_id) {
    return NextResponse.json(
      { error: 'Your account is pending approval. Contact Toys2000 to place orders.' },
      { status: 403 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Strip blocked fields
  const sanitized = Object.fromEntries(
    Object.entries(body).filter(([key]) => !BLOCKED_FIELDS.includes(key))
  );

  // Always override these with server-side values — never trust the client
  const orderPayload = {
    ...sanitized,
    repGroupID: process.env.MT_REP_GROUP_ID,
    retailerID: profile.retailer_id,
    salespersonOrderWriterID: process.env.MT_SALESPERSON_ID,
    salespersonAssignedID: process.env.MT_SALESPERSON_ID,
    salespersonIDToPay: process.env.MT_SALESPERSON_ID,
    paymentTerm: 'See Special Instructions',
    specialInstructions: 'Net 30',
    manufacturerOrderStatus: 'Not Transmitted',
    repGroupOrderStatus: 'Open',
  };

  try {
    const order = await createOrder(orderPayload);
    return NextResponse.json({ order });
  } catch (err) {
    console.error('[/api/markettime/orders POST]', err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
