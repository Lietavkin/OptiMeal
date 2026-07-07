-- Real world nutrition subsystem: restaurant meals and eating out planner

create table if not exists restaurant_meals (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  restaurant_name text not null,
  meal_name text not null,
  calories numeric(10,2) not null default 0,
  protein numeric(10,2) not null default 0,
  carbs numeric(10,2) not null default 0,
  fat numeric(10,2) not null default 0,
  serving_size text not null default '1 serving',
  estimated_price numeric(10,2) not null default 0,
  confidence_score integer not null default 80,
  source text not null default 'manual',
  entry_mode text not null default 'manual',
  meal_date date not null default current_date,
  meal_slot text not null default 'dinner',
  external_ref jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurant_meal_confidence_range check (confidence_score >= 0 and confidence_score <= 100),
  constraint restaurant_meal_slot_valid check (meal_slot in ('breakfast', 'lunch', 'dinner')),
  constraint restaurant_meal_entry_mode_valid check (entry_mode in ('manual', 'imported_menu', 'api'))
);

create table if not exists eating_out_plan_slots (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  slot_date date not null,
  meal_slot text not null,
  is_eating_out boolean not null default false,
  planned_restaurant text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint eating_out_meal_slot_valid check (meal_slot in ('breakfast', 'lunch', 'dinner')),
  unique (user_id, slot_date, meal_slot)
);

create index if not exists idx_restaurant_meals_user_id on restaurant_meals(user_id);
create index if not exists idx_restaurant_meals_meal_date on restaurant_meals(meal_date);
create index if not exists idx_restaurant_meals_restaurant_name on restaurant_meals(lower(restaurant_name));
create index if not exists idx_eating_out_plan_slots_user_id on eating_out_plan_slots(user_id);
create index if not exists idx_eating_out_plan_slots_slot_date on eating_out_plan_slots(slot_date);

alter table restaurant_meals enable row level security;
alter table eating_out_plan_slots enable row level security;

create policy "Restaurant meals readable by owner" on restaurant_meals
  for select using (auth.uid() = user_id);

create policy "Restaurant meals insertable by owner" on restaurant_meals
  for insert with check (auth.uid() = user_id);

create policy "Restaurant meals updatable by owner" on restaurant_meals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Restaurant meals deletable by owner" on restaurant_meals
  for delete using (auth.uid() = user_id);

create policy "Eating out plan readable by owner" on eating_out_plan_slots
  for select using (auth.uid() = user_id);

create policy "Eating out plan insertable by owner" on eating_out_plan_slots
  for insert with check (auth.uid() = user_id);

create policy "Eating out plan updatable by owner" on eating_out_plan_slots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Eating out plan deletable by owner" on eating_out_plan_slots
  for delete using (auth.uid() = user_id);
