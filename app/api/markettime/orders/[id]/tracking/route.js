import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getOrderTracking } from '@/lib/markettime';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const tracking = await getOrderTracking(params.id);
    return NextResponse.json({ tracking });
  } catch (err) {
    console.error('[/api/markettime/orders/tracking]', err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
