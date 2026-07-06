-- Recipe library schema

create table if not exists recipes (
  id uuid primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  instructions text,
  servings integer not null default 2,
  prep_time_minutes integer not null default 30,
  calories integer not null default 0,
  protein integer not null default 0,
  carbs integer not null default 0,
  fat integer not null default 0,
  estimated_cost numeric(10, 2) not null default 0,
  is_favorite boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists recipe_ingredients (
  id uuid primary key,
  recipe_id uuid references recipes(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  quantity numeric(10, 2) not null default 1,
  unit text not null default 'item',
  category text not null default 'other' check (category in ('produce', 'meat', 'dairy', 'grains', 'frozen', 'pantry', 'other')),
  estimated_price numeric(10, 2) not null default 0,
  created_at timestamptz default now() not null
);

alter table planned_meals add column if not exists recipe_id uuid references recipes(id) on delete set null;

create index if not exists idx_recipes_user_id on recipes (user_id);
create index if not exists idx_recipe_ingredients_recipe_id on recipe_ingredients (recipe_id);
create index if not exists idx_planned_meals_recipe_id on planned_meals (recipe_id);

alter table recipes enable row level security;
alter table recipe_ingredients enable row level security;

create policy "Recipes are readable by owner" on recipes
  for select using (auth.uid() = user_id);

create policy "Recipes can be inserted by owner" on recipes
  for insert with check (auth.uid() = user_id);

create policy "Recipes can be updated by owner" on recipes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Recipes can be deleted by owner" on recipes
  for delete using (auth.uid() = user_id);

create policy "Recipe ingredients are readable by owner" on recipe_ingredients
  for select using (auth.uid() = user_id);

create policy "Recipe ingredients can be inserted by owner" on recipe_ingredients
  for insert with check (auth.uid() = user_id);

create policy "Recipe ingredients can be updated by owner" on recipe_ingredients
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Recipe ingredients can be deleted by owner" on recipe_ingredients
  for delete using (auth.uid() = user_id);
