-- Recipes and ingredient catalog foundation for optimization

create table if not exists ingredient_catalog (
  id uuid primary key,
  created_by uuid references profiles(id) on delete set null,
  canonical_name text not null,
  aliases text[] not null default '{}',
  category text not null,
  default_unit text not null,
  common_package_size numeric(10,2) not null default 1,
  estimated_price_per_unit numeric(10,2) not null default 0,
  currency text not null default 'USD',
  calories_per_unit numeric(10,2) not null default 0,
  protein_per_unit numeric(10,2) not null default 0,
  carbs_per_unit numeric(10,2) not null default 0,
  fat_per_unit numeric(10,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (created_by, canonical_name)
);

create table if not exists store_ingredient_prices (
  id uuid primary key,
  ingredient_id uuid not null references ingredient_catalog(id) on delete cascade,
  store_key text not null,
  price_per_unit numeric(10,2) not null,
  currency text not null default 'USD',
  package_size numeric(10,2) not null default 1,
  unit text not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ingredient_id, store_key, unit)
);

create table if not exists recipes (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  servings integer not null default 1 check (servings > 0),
  cooking_time_minutes integer,
  instructions text not null default '',
  estimated_cost numeric(10,2) not null default 0,
  is_favorite boolean not null default false,
  total_calories numeric(10,2) not null default 0,
  total_protein numeric(10,2) not null default 0,
  total_carbs numeric(10,2) not null default 0,
  total_fat numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recipe_ingredients (
  id uuid primary key,
  recipe_id uuid not null references recipes(id) on delete cascade,
  ingredient_id uuid references ingredient_catalog(id) on delete set null,
  display_name text not null,
  quantity numeric(10,2) not null default 0,
  unit text not null default 'unit',
  notes text,
  estimated_cost numeric(10,2) not null default 0,
  calories numeric(10,2) not null default 0,
  protein numeric(10,2) not null default 0,
  carbs numeric(10,2) not null default 0,
  fat numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ingredient_catalog_canonical_name on ingredient_catalog (lower(canonical_name));
create index if not exists idx_ingredient_catalog_category on ingredient_catalog (category);
create index if not exists idx_store_ingredient_prices_ingredient_id on store_ingredient_prices (ingredient_id);
create index if not exists idx_recipes_user_id on recipes (user_id);
create index if not exists idx_recipes_is_favorite on recipes (is_favorite);
create index if not exists idx_recipe_ingredients_recipe_id on recipe_ingredients (recipe_id);
create index if not exists idx_recipe_ingredients_ingredient_id on recipe_ingredients (ingredient_id);

alter table ingredient_catalog enable row level security;
alter table store_ingredient_prices enable row level security;
alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;

create policy "Ingredient catalog is readable by authenticated users" on ingredient_catalog
  for select using (auth.role() = 'authenticated');

create policy "Users can create custom ingredients" on ingredient_catalog
  for insert with check (auth.uid() = created_by);

create policy "Users can update custom ingredients" on ingredient_catalog
  for update using (auth.uid() = created_by) with check (auth.uid() = created_by);

create policy "Users can delete custom ingredients" on ingredient_catalog
  for delete using (auth.uid() = created_by);

create policy "Store ingredient prices are readable by authenticated users" on store_ingredient_prices
  for select using (auth.role() = 'authenticated');

create policy "Recipes are readable by owner" on recipes
  for select using (auth.uid() = user_id);

create policy "Recipes can be inserted by owner" on recipes
  for insert with check (auth.uid() = user_id);

create policy "Recipes can be updated by owner" on recipes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Recipes can be deleted by owner" on recipes
  for delete using (auth.uid() = user_id);

create policy "Recipe ingredients are readable by recipe owner" on recipe_ingredients
  for select using (
    exists (
      select 1 from recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.user_id = auth.uid()
    )
  );

create policy "Recipe ingredients can be inserted by recipe owner" on recipe_ingredients
  for insert with check (
    exists (
      select 1 from recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.user_id = auth.uid()
    )
  );

create policy "Recipe ingredients can be updated by recipe owner" on recipe_ingredients
  for update using (
    exists (
      select 1 from recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.user_id = auth.uid()
    )
  );

create policy "Recipe ingredients can be deleted by recipe owner" on recipe_ingredients
  for delete using (
    exists (
      select 1 from recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.user_id = auth.uid()
    )
  );
