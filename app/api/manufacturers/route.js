import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * GET /api/manufacturers
 * Returns all manufacturers from the Supabase manufacturers table.
 * No MarketTime call — always served from the Supabase cache.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('manufacturers')
    .select('manufacturer_id, name, logo_url')
    .order('name');

  if (error) {
    console.error('[/api/manufacturers] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch manufacturers' }, { status: 500 });
  }

  return NextResponse.json({ manufacturers: data });
}
