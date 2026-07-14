import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

/**
 * POST /api/sync/trigger
 * Admin-only UI trigger for manual catalog sync.
 * Verifies the user is logged in and has is_admin = true,
 * then calls the sync route internally.
 *
 * Pass ?full=true for a full re-pull (no modifiedStartDate).
 * Default is a delta sync from yesterday.
 */
export async function POST(request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const full = searchParams.get('full') === 'true';

  // Build delta date (yesterday) for incremental syncs
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const modifiedStartDate = yesterday.toISOString().split('T')[0];

  const syncUrl = new URL('/api/sync', request.url);
  if (!full) {
    syncUrl.searchParams.set('modifiedStartDate', modifiedStartDate);
  } else {
    syncUrl.searchParams.set('full', 'true');
  }

  const syncRes = await fetch(syncUrl.toString(), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });

  const result = await syncRes.json();
  return NextResponse.json(result, { status: syncRes.status });
}
