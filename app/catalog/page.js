import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import CatalogGrid from './CatalogGrid';

export const metadata = { title: 'Catalog — Toys2000 Wholesale' };

/**
 * Server Component — queries Supabase directly at render time.
 * Does NOT call /api/catalog. That route exists for client-side
 * search/filter/pagination only.
 */
export default async function CatalogPage({ searchParams }) {
  const supabase = await createServerSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login?redirect=/catalog');

  const params = await searchParams;
  const manufacturerID = params.manufacturer_id || null;
  const category = params.category || null;
  const search = params.search || null;

  // Initial server-side fetch (first page)
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('show_on_website', true)
    .eq('discontinued', false)
    .order('record_id')
    .range(0, 47);

  if (manufacturerID) query = query.eq('manufacturer_id', manufacturerID);
  if (category) query = query.ilike('rep_group_category_path', `%${category}%`);
  if (search) query = query.textSearch('name', search, { type: 'websearch', config: 'english' });

  const [productsResult, manufacturersResult] = await Promise.all([
    query,
    supabase.from('manufacturers').select('manufacturer_id, name').order('name'),
  ]);

  const products = productsResult.data ?? [];
  const total = productsResult.count ?? 0;
  const manufacturers = manufacturersResult.data ?? [];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[#1a1d26]" style={{ fontFamily: "'Baloo 2', cursive" }}>
              {manufacturerID
                ? manufacturers.find((m) => m.manufacturer_id === manufacturerID)?.name ?? 'Brand Catalog'
                : 'All Products'}
            </h1>
            <p className="text-sm text-[#5f6980] mt-1">{total.toLocaleString()} products</p>
          </div>
        </div>

        <CatalogGrid
          initialProducts={products}
          initialTotal={total}
          manufacturers={manufacturers}
          initialFilters={{ manufacturerID, category, search }}
        />
      </div>
    </div>
  );
}
