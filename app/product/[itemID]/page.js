import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
import { redirect, notFound } from 'next/navigation';
import ProductDetail from './ProductDetail';

export async function generateMetadata({ params }) {
  const { itemID } = await params;
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('products')
    .select('name, manufacturer_name')
    .eq('record_id', itemID)
    .single();
  return { title: data ? `${data.name} — Toys2000` : 'Product — Toys2000' };
}

export default async function ProductPage({ params }) {
  const { itemID } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect(`/login?redirect=/product/${itemID}`);

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('record_id', itemID)
    .single();

  if (error || !product) notFound();

  // Fetch related products from same manufacturer
  const { data: related } = await supabase
    .from('products')
    .select('record_id, name, unit_price, primary_image_url, manufacturer_name, minimum_quantity')
    .eq('manufacturer_id', product.manufacturer_id)
    .eq('show_on_website', true)
    .eq('discontinued', false)
    .neq('record_id', product.record_id)
    .limit(6);

  return <ProductDetail product={product} related={related ?? []} />;
}
