alter table if exists store_inventory
  add column if not exists external_product_id text,
  add column if not exists source_hash text;

create unique index if not exists uq_store_inventory_external_product
  on store_inventory(store_key, external_product_id)
  where external_product_id is not null;

insert into grocery_stores (key, display_name)
values ('billa', 'Billa')
on conflict (key) do update set
  display_name = excluded.display_name,
  updated_at = now();

create table if not exists provider_sync_state (
  provider_key text primary key references grocery_stores(key) on delete cascade,
  status text not null default 'idle',
  last_synced_at timestamptz,
  cursor text,
  products_inserted integer not null default 0,
  products_updated integer not null default 0,
  products_unchanged integer not null default 0,
  error_message text,
  updated_at timestamptz not null default now(),
  constraint provider_sync_state_status_check check (status in ('idle', 'running', 'success', 'error'))
);

create table if not exists provider_sync_history (
  id uuid primary key,
  provider_key text not null references grocery_stores(key) on delete cascade,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  products_inserted integer not null default 0,
  products_updated integer not null default 0,
  products_unchanged integer not null default 0,
  error_message text,
  constraint provider_sync_history_status_check check (status in ('idle', 'running', 'success', 'error'))
);

create index if not exists idx_provider_sync_history_provider_started
  on provider_sync_history(provider_key, started_at desc);

alter table provider_sync_state enable row level security;
alter table provider_sync_history enable row level security;

create policy "Provider sync state readable by authenticated users" on provider_sync_state
  for select using (auth.role() = 'authenticated');

create policy "Provider sync state writable by authenticated users" on provider_sync_state
  for insert with check (auth.role() = 'authenticated');

create policy "Provider sync state updatable by authenticated users" on provider_sync_state
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Provider sync history readable by authenticated users" on provider_sync_history
  for select using (auth.role() = 'authenticated');

create policy "Provider sync history writable by authenticated users" on provider_sync_history
  for insert with check (auth.role() = 'authenticated');

create policy "Provider sync history updatable by authenticated users" on provider_sync_history
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
