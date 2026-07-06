-- Shopping intelligence schema

create table if not exists shopping_lists (
  id uuid primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  plan_id uuid references meal_plans(id) on delete set null,
  weekly_budget numeric(10, 2) not null default 150.00,
  optimizer_mode text not null default 'balanced' check (optimizer_mode in ('cheapest', 'balanced', 'healthiest')),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists shopping_list_items (
  id uuid primary key,
  list_id uuid references shopping_lists(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  category text not null check (category in ('produce', 'meat', 'dairy', 'grains', 'frozen', 'pantry', 'other')),
  quantity numeric(10, 2) not null default 1,
  unit text not null default 'item',
  base_price numeric(10, 2) not null,
  estimated_price numeric(10, 2) not null,
  nutrition_value numeric(5, 2) not null default 50,
  purchased boolean not null default false,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_shopping_lists_user_id on shopping_lists (user_id);
create index if not exists idx_shopping_list_items_list_id on shopping_list_items (list_id);
create index if not exists idx_shopping_list_items_user_id on shopping_list_items (user_id);

alter table shopping_lists enable row level security;
alter table shopping_list_items enable row level security;

create policy "Shopping lists are readable by owner" on shopping_lists
  for select using (auth.uid() = user_id);

create policy "Shopping lists can be inserted by owner" on shopping_lists
  for insert with check (auth.uid() = user_id);

create policy "Shopping lists can be updated by owner" on shopping_lists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Shopping lists can be deleted by owner" on shopping_lists
  for delete using (auth.uid() = user_id);

create policy "Shopping list items are readable by owner" on shopping_list_items
  for select using (auth.uid() = user_id);

create policy "Shopping list items can be inserted by owner" on shopping_list_items
  for insert with check (auth.uid() = user_id);

create policy "Shopping list items can be updated by owner" on shopping_list_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Shopping list items can be deleted by owner" on shopping_list_items
  for delete using (auth.uid() = user_id);
