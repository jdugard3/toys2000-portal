import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getCustomerShipTos } from '@/lib/markettime';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, is_admin')
    .eq('id', session.user.id)
    .single();

  if (!profile?.is_admin && profile?.retailer_id !== params.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const shipTos = await getCustomerShipTos(params.id);
    return NextResponse.json({ shipTos });
  } catch (err) {
    console.error('[/api/markettime/customer/shiptos]', err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
