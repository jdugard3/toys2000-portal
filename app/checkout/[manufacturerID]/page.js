import { createServerSupabaseClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
import { redirect, notFound } from 'next/navigation';
import CheckoutClient from './CheckoutClient';

export const metadata = { title: 'Checkout — Toys2000 Wholesale' };

export default async function CheckoutPage({ params }) {
  const { manufacturerID } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login?redirect=/cart');

  const { data: profile } = await supabase
    .from('profiles')
    .select('retailer_id, company_name, approved')
    .eq('id', session.user.id)
    .single();

  // Fetch manufacturer from Supabase cache
  const { data: manufacturer } = await supabase
    .from('manufacturers')
    .select('manufacturer_id, name, logo_url')
    .eq('manufacturer_id', manufacturerID)
    .single();

  if (!manufacturer) notFound();

  return (
    <CheckoutClient
      manufacturerID={manufacturerID}
      manufacturerName={manufacturer.name}
      profile={profile}
    />
  );
}
