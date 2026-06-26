import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getOrders } from '@/lib/markettime';
import { NextResponse } from 'next/server';

/**
 * POST /api/markettime/orders/list
 * Returns orders for the authenticated customer from MarketTime.
 * Automatically scopes to the customer's retailerID from their profile.
 */
export async function POST(request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.retailer_id) {
    return NextResponse.json({ orders: [] });
  }

  let extraFilters = {};
  try {
    const body = await request.json();
    extraFilters = body ?? {};
  } catch {
    // No body is fine — we'll use defaults
  }

  const filters = {
    ...extraFilters,
    // Scope to this customer's retailerID unless admin
    ...(profile.is_admin ? {} : { retailerID: profile.retailer_id }),
    repGroupID: process.env.MT_REP_GROUP_ID,
  };

  try {
    const orders = await getOrders(filters);
    return NextResponse.json({ orders });
  } catch (err) {
    console.error('[/api/markettime/orders/list]', err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
