import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * GET /api/catalog
 * Returns paginated products from the Supabase products table.
 * This route exists for client-side fetches (search, filter, pagination)
 * triggered by user interaction. Server Components query Supabase directly.
 *
 * Query params:
 *   manufacturer_id — filter by brand
 *   category        — filter by rep_group_category_path (partial match)
 *   search          — full-text search on name/description
 *   page            — 1-indexed page number (default: 1)
 *   limit           — results per page (default: 48, max: 100)
 */
export async function GET(request) {
  const supabase = await createServerSupabaseClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const manufacturerID = searchParams.get('manufacturer_id');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '48', 10));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('show_on_website', true)
    .eq('discontinued', false)
    .range(offset, offset + limit - 1)
    .order('name');

  if (manufacturerID) {
    query = query.eq('manufacturer_id', manufacturerID);
  }

  if (category) {
    query = query.ilike('rep_group_category_path', `%${category}%`);
  }

  if (search) {
    query = query.textSearch('name', search, { type: 'websearch', config: 'english' });
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[/api/catalog] Supabase error:', error);
    return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 });
  }

  return NextResponse.json({
    products: data,
    total: count,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  });
}
