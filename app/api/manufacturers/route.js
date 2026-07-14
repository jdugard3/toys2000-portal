import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { getBrowseAccess, getCatalogDb } from '@/lib/browse-access';

/** GET /api/manufacturers — public brand list for catalog filters. */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { showPrices } = await getBrowseAccess(supabase);
  const db = getCatalogDb(supabase, showPrices);

  const { data, error } = await db
    .from('manufacturers')
    .select('manufacturer_id, name, logo_url')
    .order('name');

  if (error) {
    console.error('[/api/manufacturers] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch manufacturers' }, { status: 500 });
  }

  return NextResponse.json({ manufacturers: data });
}
