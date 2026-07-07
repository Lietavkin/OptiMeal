-- Grocery stores and inventory for shopping optimization engine

create table if not exists grocery_stores (
  key text primary key,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists store_inventory (
  id uuid primary key,
  store_key text not null references grocery_stores(key) on delete cascade,
  ingredient_id uuid references ingredient_catalog(id) on delete set null,
  name text not null,
  brand text not null,
  category text not null,
  package_size numeric(10,2) not null,
  package_unit text not null,
  calories numeric(10,2) not null default 0,
  protein numeric(10,2) not null default 0,
  carbs numeric(10,2) not null default 0,
  fat numeric(10,2) not null default 0,
  estimated_price numeric(10,2) not null,
  currency text not null default 'USD',
  availability boolean not null default true,
  last_updated timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_store_inventory_store_key on store_inventory(store_key);
create index if not exists idx_store_inventory_category on store_inventory(category);
create index if not exists idx_store_inventory_name on store_inventory(lower(name));
create index if not exists idx_store_inventory_ingredient_id on store_inventory(ingredient_id);

insert into grocery_stores (key, display_name)
values
  ('lidl', 'Lidl'),
  ('kaufland', 'Kaufland'),
  ('tesco', 'Tesco'),
  ('carrefour', 'Carrefour'),
  ('aldi', 'Aldi')
on conflict (key) do update set
  display_name = excluded.display_name,
  updated_at = now();

alter table grocery_stores enable row level security;
alter table store_inventory enable row level security;

create policy "Grocery stores readable by authenticated users" on grocery_stores
  for select using (auth.role() = 'authenticated');

create policy "Store inventory readable by authenticated users" on store_inventory
  for select using (auth.role() = 'authenticated');

create policy "Store inventory writable by authenticated users" on store_inventory
  for insert with check (auth.role() = 'authenticated');

create policy "Store inventory updatable by authenticated users" on store_inventory
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Store inventory deletable by authenticated users" on store_inventory
  for delete using (auth.role() = 'authenticated');
