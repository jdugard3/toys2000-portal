import { createServerSupabaseClient } from '@/lib/supabase-server';
import { CATALOG_PRODUCT_SELECT } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
import { redirect, notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import CatalogGrid from '../CatalogGrid';

export async function generateMetadata({ params }) {
  const { brand } = await params;
  return { title: `${decodeURIComponent(brand)} — Toys2000 Wholesale` };
}

/**
 * Server Component — direct Supabase query, no API round-trip.
 */
export default async function BrandCatalogPage({ params }) {
  const { brand } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/catalog/${brand}`);

  // Brand param is the manufacturer_id (e.g. "M999864")
  const manufacturerID = decodeURIComponent(brand);

  const [mfrResult, productsResult, allMfrsResult] = await Promise.all([
    supabase.from('manufacturers').select('*').eq('manufacturer_id', manufacturerID).single(),
    supabase
      .from('products')
      .select(CATALOG_PRODUCT_SELECT, { count: 'exact' })
      .eq('manufacturer_id', manufacturerID)
      .eq('show_on_website', true)
      .eq('discontinued', false)
      .order('record_id')
      .range(0, 47),
    supabase.from('manufacturers').select('manufacturer_id, name').order('name'),
  ]);

  if (mfrResult.error || !mfrResult.data) notFound();

  const manufacturer = mfrResult.data;
  const products = productsResult.data ?? [];
  const total = productsResult.count ?? 0;
  const manufacturers = allMfrsResult.data ?? [];

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      {/* Brand header */}
      <div className="bg-white border-b border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex items-center gap-6">
          {manufacturer.logo_url && (
            <Image
              src={manufacturer.logo_url}
              alt={manufacturer.name}
              width={120}
              height={60}
              className="object-contain"
              style={{ width: 'auto', height: '3.5rem' }}
            />
          )}
          <div>
            <Link href="/catalog" className="text-xs text-[#5f6980] hover:text-[#f15a24] transition-colors">
              ← All Brands
            </Link>
            <h1 className="text-3xl font-bold text-[#1a1d26] mt-1" style={{ fontFamily: "'Baloo 2', cursive" }}>
              {manufacturer.name}
            </h1>
            <p className="text-sm text-[#5f6980] mt-0.5">{total.toLocaleString()} products</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <CatalogGrid
          initialProducts={products}
          initialTotal={total}
          manufacturers={manufacturers}
          initialFilters={{ manufacturerID, category: null, search: null }}
        />
      </div>
    </div>
  );
}
