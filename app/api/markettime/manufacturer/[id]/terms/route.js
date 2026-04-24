import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getManufacturerPaymentTerms } from '@/lib/markettime';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const terms = await getManufacturerPaymentTerms(params.id);
    return NextResponse.json({ terms });
  } catch (err) {
    console.error('[/api/markettime/manufacturer/terms]', err);
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
