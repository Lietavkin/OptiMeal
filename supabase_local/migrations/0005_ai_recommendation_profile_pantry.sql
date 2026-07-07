-- AI recommendation profile and pantry subsystem

create table if not exists user_optimization_profiles (
  id uuid primary key,
  user_id uuid not null unique references profiles(id) on delete cascade,
  budget numeric(10,2) not null default 120,
  health_priority integer not null default 50,
  taste_priority integer not null default 50,
  convenience_priority integer not null default 50,
  cooking_skill integer not null default 50,
  cooking_time_available integer not null default 45,
  favorite_cuisines text[] not null default '{}',
  disliked_foods text[] not null default '{}',
  allergies text[] not null default '{}',
  dietary_style text not null default 'omnivore',
  fitness_goal text not null default 'maintenance',
  family_size integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_opt_profile_health_priority check (health_priority >= 0 and health_priority <= 100),
  constraint user_opt_profile_taste_priority check (taste_priority >= 0 and taste_priority <= 100),
  constraint user_opt_profile_convenience_priority check (convenience_priority >= 0 and convenience_priority <= 100),
  constraint user_opt_profile_cooking_skill check (cooking_skill >= 0 and cooking_skill <= 100),
  constraint user_opt_profile_cooking_time check (cooking_time_available >= 0),
  constraint user_opt_profile_family_size check (family_size > 0)
);

create table if not exists pantry_items (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  ingredient_id uuid references ingredient_catalog(id) on delete set null,
  ingredient_name text not null,
  category text not null default 'General',
  quantity numeric(10,2) not null default 0,
  unit text not null default 'unit',
  expiration_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pantry_quantity_non_negative check (quantity >= 0)
);

create index if not exists idx_user_optimization_profiles_user_id on user_optimization_profiles(user_id);
create index if not exists idx_pantry_items_user_id on pantry_items(user_id);
create index if not exists idx_pantry_items_expiration_date on pantry_items(expiration_date);
create index if not exists idx_pantry_items_ingredient_name on pantry_items(lower(ingredient_name));

alter table user_optimization_profiles enable row level security;
alter table pantry_items enable row level security;

create policy "User optimization profile readable by owner" on user_optimization_profiles
  for select using (auth.uid() = user_id);

create policy "User optimization profile insertable by owner" on user_optimization_profiles
  for insert with check (auth.uid() = user_id);

create policy "User optimization profile updatable by owner" on user_optimization_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "User optimization profile deletable by owner" on user_optimization_profiles
  for delete using (auth.uid() = user_id);

create policy "Pantry items readable by owner" on pantry_items
  for select using (auth.uid() = user_id);

create policy "Pantry items insertable by owner" on pantry_items
  for insert with check (auth.uid() = user_id);

create policy "Pantry items updatable by owner" on pantry_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Pantry items deletable by owner" on pantry_items
  for delete using (auth.uid() = user_id);
