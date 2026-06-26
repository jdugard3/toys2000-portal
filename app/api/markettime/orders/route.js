import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createOrder, getCustomer, getCustomerShipTos } from '@/lib/markettime';
import { buildMarketTimeOrder, getShipToRecordId } from '@/lib/build-markettime-order';
import { NextResponse } from 'next/server';

/**
 * POST /api/markettime/orders
 * Creates a new MarketTime order on behalf of the authenticated customer.
 * Enriches the client cart payload with bill-to / ship-to addresses from MT.
 */
export async function POST(request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, approved')
    .eq('id', user.id)
    .single();

  if (!profile?.retailer_id || !profile.approved) {
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

  if (!body.manufacturerID || !body.retailerShipToID || !body.details?.length) {
    return NextResponse.json(
      { error: 'manufacturerID, retailerShipToID, and order line items are required.' },
      { status: 400 }
    );
  }

  try {
    const [customer, shipTosRaw] = await Promise.all([
      getCustomer(profile.retailer_id),
      getCustomerShipTos(profile.retailer_id),
    ]);

    const shipToList = Array.isArray(shipTosRaw) ? shipTosRaw : shipTosRaw?.records ?? [];
    const targetShipToId = Number(body.retailerShipToID);
    const shipTo =
      shipToList.find((s) => getShipToRecordId(s) === targetShipToId) ??
      shipToList.find((s) => getShipToRecordId(s) === Number(body.retailerShipToID)) ??
      shipToList[0];

    if (!customer) {
      return NextResponse.json({ error: 'MarketTime customer record not found.' }, { status: 404 });
    }
    if (!shipTo) {
      return NextResponse.json({ error: 'Ship-to address not found for this account.' }, { status: 400 });
    }

    const orderPayload = {
      ...buildMarketTimeOrder({
        clientOrder: body,
        customer,
        shipTo,
        retailerID: profile.retailer_id,
      }),
      repGroupID: process.env.MT_REP_GROUP_ID,
      salespersonOrderWriterID: process.env.MT_SALESPERSON_ID,
      salespersonAssignedID: process.env.MT_SALESPERSON_ID,
      salespersonIDToPay: process.env.MT_SALESPERSON_ID,
    };

    const order = await createOrder(orderPayload);
    return NextResponse.json({ order });
  } catch (err) {
    console.error('[/api/markettime/orders POST]', err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
