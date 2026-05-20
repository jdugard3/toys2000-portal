import { createAdminClient } from '@/lib/supabase-server';
import { getItems, getManufacturers } from '@/lib/markettime';
import { NextResponse } from 'next/server';

const PAGE_SIZE = 250;

async function withRetry(label, fn, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === attempts) break;
      const delayMs = 750 * attempt;
      console.warn(`[Sync] ${label} failed (attempt ${attempt}/${attempts}); retrying in ${delayMs}ms`, err);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function isAuthorized(request) {
  const authHeader = request.headers.get('authorization');
  // Vercel cron uses CRON_SECRET; admin trigger uses SUPABASE_SERVICE_ROLE_KEY
  return (
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    authHeader === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
  );
}

/**
 * GET /api/sync
 * Called by Vercel cron (daily at 4am UTC).
 * Always runs as a delta sync from yesterday.
 */
export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const modifiedStartDate = yesterday.toISOString().split('T')[0];

  return runSync({ modifiedStartDate, isFull: false });
}

/**
 * POST /api/sync
 * Admin-triggered sync — requires Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
 *
 * Query params:
 *   modifiedStartDate (optional) — ISO date string for delta sync e.g. "2026-04-22"
 *   full=true — force a full re-pull with no date filter
 *
 * Syncs both products and manufacturers in sequence.
 */
export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const modifiedStartDate = searchParams.get('modifiedStartDate');
  const isFull = searchParams.get('full') === 'true';

  return runSync({ modifiedStartDate, isFull });
}

async function runSync({ modifiedStartDate, isFull }) {

  const db = createAdminClient();

  const startedAt = new Date().toISOString();

  const logId = crypto.randomUUID();
  try {
    await db
      .from('sync_log')
      .insert({ id: logId, started_at: startedAt });
  } catch {
    // Non-fatal — sync proceeds even if we can't log the start
  }

  let itemsSynced = 0;
  let manufacturersSynced = 0;
  let syncError = null;

  try {
    // ── Step 1: Sync manufacturers ──────────────────────────────────────────
    const mfrsResponse = await withRetry('GET /manufacturers', () => getManufacturers());
    const manufacturers = Array.isArray(mfrsResponse) ? mfrsResponse : mfrsResponse?.records ?? [];

    if (manufacturers.length > 0) {
      const mfrRows = manufacturers.map((m) => ({
        manufacturer_id: m.manufacturerID ?? m.recordID,
        name: m.name ?? m.manufacturerName,
        logo_url: m.logoUrl ?? m.logoURL ?? null,
        raw: m,
        last_synced_at: new Date().toISOString(),
      }));

      const { error: mfrError } = await db
        .from('manufacturers')
        .upsert(mfrRows, { onConflict: 'manufacturer_id' });

      if (mfrError) throw new Error(`Manufacturer upsert failed: ${mfrError.message}`);
      manufacturersSynced = mfrRows.length;
    }

    // ── Step 2: Sync products (paginated) ────────────────────────────────────
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const params = { offset, recordSize: PAGE_SIZE };
      if (modifiedStartDate && !isFull) {
        params.modifiedStartDate = modifiedStartDate;
      }

      const response = await withRetry(
        `GET /items offset=${offset}`,
        () => getItems(params),
        4
      );
      const records = Array.isArray(response) ? response : response?.records ?? [];

      if (records.length === 0) {
        hasMore = false;
        break;
      }

      // Upsert ALL records returned by MarketTime, including discontinued and
      // hidden ones. Filtering them out here would freeze stale rows in the
      // products table forever (an item that flipped from active to
      // discontinued would never get its discontinued flag updated). The
      // customer-facing /api/catalog query already filters these out, so
      // storing the full snapshot is safe and is required for correctness.
      const productRows = records
        .map((item) => ({
          record_id: item.recordID,
          item_number: item.itemNumber,
          manufacturer_id: item.manufacturerID,
          manufacturer_name: item.manufacturerName,
          name: item.name,
          description: item.description,
          unit_price: item.unitPrice,
          retail_price: item.retailPrice,
          minimum_quantity: item.minimumQuantity ?? 1,
          quantity_increment: item.quantityIncrement ?? 1,
          case_quantity: item.caseQuantity ?? null,
          unit_qty: item.unitQty ?? null,
          primary_image_url: item.primaryImageUrl ?? null,
          additional_image_urls: item.additionalImageUrl ?? null,
          is_available: item.isAvailable ?? true,
          show_on_website: item.showOnWebsite ?? true,
          discontinued: item.discontinued ?? false,
          qty_available: item.qtyAvailable ?? null,
          discount_percent: item.discountPercent ?? null,
          scs_details: item.scsDetails ?? null,
          volume_pricing: item.volumePricing ?? null,
          rep_group_categories: item.repGroupCategories ?? null,
          manufacturer_category: item.manufacturerCategory ?? null,
          category_path: item.categoryPath ?? null,
          rep_group_category_path: item.repGroupCategoryPath ?? null,
          raw: item,
          last_synced_at: new Date().toISOString(),
        }));

      if (productRows.length > 0) {
        // Some item manufacturerIDs may not appear in GET /manufacturers. Insert
        // lightweight placeholder rows first so the products FK does not block sync.
        const manufacturerPlaceholders = [
          ...new Map(
            productRows
              .filter((item) => item.manufacturer_id)
              .map((item) => [
                item.manufacturer_id,
                {
                  manufacturer_id: item.manufacturer_id,
                  name: item.manufacturer_name || item.manufacturer_id,
                  raw: {
                    source: 'products-sync-placeholder',
                    manufacturerID: item.manufacturer_id,
                    manufacturerName: item.manufacturer_name,
                  },
                  last_synced_at: new Date().toISOString(),
                },
              ])
          ).values(),
        ];

        if (manufacturerPlaceholders.length > 0) {
          const { error: placeholderError } = await db
            .from('manufacturers')
            .upsert(manufacturerPlaceholders, { onConflict: 'manufacturer_id', ignoreDuplicates: true });

          if (placeholderError) {
            throw new Error(`Manufacturer placeholder upsert failed: ${placeholderError.message}`);
          }
        }

        const { error: productError } = await db
          .from('products')
          .upsert(productRows, { onConflict: 'record_id' });

        if (productError) throw new Error(`Product upsert failed: ${productError.message}`);
        itemsSynced += productRows.length;
      }

      // Stop paginating if we got fewer records than requested
      if (records.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        offset += PAGE_SIZE;
      }
    }
  } catch (err) {
    syncError = err.message;
    console.error('[Sync] Error:', err);
  }

  // Write final sync_log entry
  const finishedAt = new Date().toISOString();
  await db.from('sync_log').update({
    finished_at: finishedAt,
    items_synced: itemsSynced,
    manufacturers_synced: manufacturersSynced,
    error: syncError,
  }).eq('id', logId);

  const success = !syncError;
  return NextResponse.json(
    {
      success,
      itemsSynced,
      manufacturersSynced,
      startedAt,
      finishedAt,
      error: syncError,
    },
    { status: success ? 200 : 500 }
  );
}
