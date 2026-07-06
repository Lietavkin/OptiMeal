-- Create initial app schema for OptiMeal

create table if not exists profiles (
  id uuid primary key,
  email text unique not null,
  display_name text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists nutrition_goals (
  id uuid primary key,
  user_id uuid references profiles(id) on delete cascade,
  calories integer not null default 2000,
  protein integer not null default 100,
  carbs integer not null default 250,
  fat integer not null default 70,
  active boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, active)
);

create table if not exists meals (
  id uuid primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  calories integer not null,
  protein integer not null,
  carbs integer not null,
  fat integer not null,
  photo_url text,
  photo_path text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists meal_photos (
  id uuid primary key,
  meal_id uuid references meals(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_meals_user_id on meals (user_id);
create index if not exists idx_meals_created_at on meals (created_at desc);
create index if not exists idx_nutrition_goals_user_id on nutrition_goals (user_id);
create index if not exists idx_meal_photos_meal_id on meal_photos (meal_id);
create index if not exists idx_meal_photos_user_id on meal_photos (user_id);

-- RLS: enable security
alter table profiles enable row level security;
alter table nutrition_goals enable row level security;
alter table meals enable row level security;
alter table meal_photos enable row level security;

create policy "Profiles can be read by owner" on profiles
  for select using (auth.uid() = id);

create policy "Profiles can be inserted by signed in user" on profiles
  for insert with check (auth.uid() = id);

create policy "Profiles can be updated by owner" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Nutrition goals are readable by owner" on nutrition_goals
  for select using (auth.uid() = user_id);

create policy "Nutrition goals can be inserted by owner" on nutrition_goals
  for insert with check (auth.uid() = user_id);

create policy "Nutrition goals can be updated by owner" on nutrition_goals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Meals are readable by owner" on meals
  for select using (auth.uid() = user_id);

create policy "Meals can be inserted by owner" on meals
  for insert with check (auth.uid() = user_id);

create policy "Meals can be updated by owner" on meals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Meals can be deleted by owner" on meals
  for delete using (auth.uid() = user_id);

create policy "Meal photos are readable by owner" on meal_photos
  for select using (auth.uid() = user_id);

create policy "Meal photos can be inserted by owner" on meal_photos
  for insert with check (auth.uid() = user_id);

create policy "Meal photos can be deleted by owner" on meal_photos
  for delete using (auth.uid() = user_id);
