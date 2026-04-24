import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCustomer } from '@/lib/markettime';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Users can only fetch their own customer record
  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, is_admin')
    .eq('id', session.user.id)
    .single();

  const isAdmin = profile?.is_admin;
  const userRetailerId = profile?.retailer_id;

  if (!isAdmin && userRetailerId !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const customer = await getCustomer(params.id);
    return NextResponse.json({ customer });
  } catch (err) {
    console.error('[/api/markettime/customer]', err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
