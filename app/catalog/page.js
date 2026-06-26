import { createServerSupabaseClient } from '@/lib/supabase-server';
import { CATALOG_PRODUCT_SELECT } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';
import CatalogGrid from './CatalogGrid';

export const metadata = { title: 'Catalog — Toys2000 Wholesale' };

export default async function CatalogPage({ searchParams }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/catalog');

  const params = await searchParams;
  let manufacturerID = params.manufacturer_id || null;
  const category = params.category || null;
  const search = params.search || null;

  // Home page brand tiles link with ?brand=Airhead — resolve to manufacturer_id
  if (!manufacturerID && params.brand) {
    const { data: mfr } = await supabase
      .from('manufacturers')
      .select('manufacturer_id')
      .ilike('name', params.brand)
      .maybeSingle();
    manufacturerID = mfr?.manufacturer_id ?? null;
  }

  let query = supabase
    .from('products')
    .select(CATALOG_PRODUCT_SELECT, { count: 'exact' })
    .eq('show_on_website', true)
    .eq('discontinued', false)
    .order('record_id')
    .range(0, 47);

  if (manufacturerID) query = query.eq('manufacturer_id', manufacturerID);
  if (category) query = query.ilike('rep_group_category_path', `%${category}%`);
  if (search) {
    const term = search.replace(/[%_]/g, '\\$&');
    query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const [productsResult, manufacturersResult] = await Promise.all([
    query,
    supabase.from('manufacturers').select('manufacturer_id, name').order('name'),
  ]);

  const products = productsResult.data ?? [];
  const total = productsResult.count ?? 0;
  const manufacturers = manufacturersResult.data ?? [];

  return (
    <div className="min-h-screen bg-[#f7f8fa] products-page">
      <div className="products-layout-container">
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
