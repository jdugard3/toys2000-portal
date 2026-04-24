-- ============================================================
-- Toys2000 Portal — Supabase Schema
-- Run this in the Supabase SQL editor to set up all tables.
-- ============================================================


-- ─── profiles ────────────────────────────────────────────────
-- Extends Supabase auth.users. One row per registered user.
-- retailer_id is set manually by admin after Jimmy approves the customer in MT.
-- is_admin gates the /admin route.

create table if not exists profiles (
  id                uuid references auth.users on delete cascade primary key,
  retailer_id       text,           -- MarketTime retailerID e.g. "B2200908"
  company_name      text,
  approved          boolean not null default false,
  is_admin          boolean not null default false,
  created_at        timestamptz not null default now()
);

-- Auto-create a profile row when a new user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, company_name)
  values (new.id, new.raw_user_meta_data->>'company_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ─── manufacturers ────────────────────────────────────────────
-- Cached from MarketTime GET /manufacturers during daily sync.
-- Used for brand nav, logo display, and checkout dropdowns.

create table if not exists manufacturers (
  manufacturer_id   text primary key,       -- MT format e.g. "M999864"
  name              text not null,
  logo_url          text,
  raw               jsonb,                  -- full MT manufacturer response
  last_synced_at    timestamptz not null default now()
);


-- ─── products ─────────────────────────────────────────────────
-- Cached from MarketTime GET /items during daily sync.
-- The catalog is served from this table, never from live MT calls.
-- Filter all catalog queries: show_on_website = true AND discontinued = false.

create table if not exists products (
  record_id                 integer primary key,    -- MT recordID
  item_number               text not null,
  manufacturer_id           text not null references manufacturers(manufacturer_id) on delete cascade,
  manufacturer_name         text,
  name                      text,
  description               text,
  unit_price                numeric(10, 2),
  retail_price              numeric(10, 2),
  minimum_quantity          integer not null default 1,
  quantity_increment        integer not null default 1,
  case_quantity             integer,
  unit_qty                  integer,
  primary_image_url         text,
  additional_image_urls     jsonb,                  -- MT additionalImageUrl array (detail page carousel)
  is_available              boolean not null default true,
  show_on_website           boolean not null default true,  -- MT flag; exclude false from all catalog queries
  discontinued              boolean not null default false,
  qty_available             integer,
  discount_percent          numeric(5, 2),
  scs_details               jsonb,                  -- color/size/style variants
  volume_pricing            jsonb,                  -- bulk pricing tiers
  rep_group_categories      jsonb,                  -- rep group category/subcategory
  manufacturer_category     jsonb,                  -- vendor-specific categories (brand-level filter)
  category_path             text,
  rep_group_category_path   text,
  raw                       jsonb,                  -- full MT item response (future-proofing)
  last_synced_at            timestamptz not null default now()
);

create index if not exists products_manufacturer_id_idx on products(manufacturer_id);
create index if not exists products_show_on_website_idx on products(show_on_website);
create index if not exists products_discontinued_idx on products(discontinued);
-- Full-text search on name and description
create index if not exists products_search_idx
  on products using gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));


-- ─── cart_items ───────────────────────────────────────────────
-- Server-side cart persistence. minimum_quantity and quantity_increment
-- are stored on the row at add-to-cart time so checkout validation
-- works without extra DB calls.

create table if not exists cart_items (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users on delete cascade,
  item_number           text not null,
  item_id               integer,                   -- MT recordID
  manufacturer_id       text not null,
  manufacturer_name     text,
  name                  text,
  unit_price            numeric(10, 2),
  quantity              integer not null check (quantity > 0),
  unit_qty              integer,                   -- case pack size
  minimum_quantity      integer not null default 1,
  quantity_increment    integer not null default 1,
  primary_image_url     text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists cart_items_user_id_idx on cart_items(user_id);
create index if not exists cart_items_user_manufacturer_idx on cart_items(user_id, manufacturer_id);

-- Auto-update updated_at on cart_items changes
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cart_items_updated_at on cart_items;
create trigger cart_items_updated_at
  before update on cart_items
  for each row execute procedure update_updated_at();


-- ─── sync_log ─────────────────────────────────────────────────
-- Tracks catalog sync job runs. Used by admin dashboard and debugging.

create table if not exists sync_log (
  id                    uuid primary key default gen_random_uuid(),
  started_at            timestamptz not null default now(),
  finished_at           timestamptz,
  items_synced          integer,
  manufacturers_synced  integer,
  error                 text
);


-- ─── Row Level Security ───────────────────────────────────────

alter table profiles enable row level security;
alter table cart_items enable row level security;
alter table products enable row level security;
alter table manufacturers enable row level security;
alter table sync_log enable row level security;

-- profiles: users can read and update their own row only
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- cart_items: users can only see and manage their own cart
create policy "Users manage own cart"
  on cart_items for all using (auth.uid() = user_id);

-- products: anyone authenticated can read (browsing is auth-gated via middleware)
create policy "Authenticated users can read products"
  on products for select using (auth.role() = 'authenticated');

-- manufacturers: same
create policy "Authenticated users can read manufacturers"
  on manufacturers for select using (auth.role() = 'authenticated');

-- sync_log: admin only (via service role in sync routes)
-- Service role bypasses RLS, so no policy needed for the sync job itself.
-- Deny everything for regular users.
create policy "No public access to sync_log"
  on sync_log for select using (false);
