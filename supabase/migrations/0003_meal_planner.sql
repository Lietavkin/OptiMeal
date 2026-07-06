-- Weekly meal planner schema

create table if not exists meal_plans (
  id uuid primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  week_start date not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists planned_meals (
  id uuid primary key,
  plan_id uuid references meal_plans(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  day_index smallint not null check (day_index >= 0 and day_index <= 6),
  meal_slot text not null check (meal_slot in ('breakfast', 'lunch', 'dinner')),
  name text not null,
  calories integer not null,
  protein integer not null,
  carbs integer not null,
  fat integer not null,
  description text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (plan_id, day_index, meal_slot)
);

create index if not exists idx_meal_plans_user_id on meal_plans (user_id);
create index if not exists idx_meal_plans_week_start on meal_plans (week_start desc);
create index if not exists idx_planned_meals_plan_id on planned_meals (plan_id);
create index if not exists idx_planned_meals_user_id on planned_meals (user_id);

alter table meal_plans enable row level security;
alter table planned_meals enable row level security;

create policy "Meal plans are readable by owner" on meal_plans
  for select using (auth.uid() = user_id);

create policy "Meal plans can be inserted by owner" on meal_plans
  for insert with check (auth.uid() = user_id);

create policy "Meal plans can be updated by owner" on meal_plans
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Meal plans can be deleted by owner" on meal_plans
  for delete using (auth.uid() = user_id);

create policy "Planned meals are readable by owner" on planned_meals
  for select using (auth.uid() = user_id);

create policy "Planned meals can be inserted by owner" on planned_meals
  for insert with check (auth.uid() = user_id);

create policy "Planned meals can be updated by owner" on planned_meals
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Planned meals can be deleted by owner" on planned_meals
  for delete using (auth.uid() = user_id);
