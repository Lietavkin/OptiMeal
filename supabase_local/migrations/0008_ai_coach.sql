create table if not exists ai_coach_daily_checkins (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  entry_date date not null,
  athlete_day_type text not null default 'training',
  hunger integer not null default 3,
  energy integer not null default 3,
  sleep integer not null default 3,
  mood integer not null default 3,
  recovery integer not null default 3,
  water_ml integer not null default 0,
  weight_kg numeric(6,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_coach_daily_checkins_unique unique (user_id, entry_date),
  constraint ai_coach_day_type_valid check (athlete_day_type in ('training', 'recovery', 'rest', 'match')),
  constraint ai_coach_hunger_range check (hunger >= 1 and hunger <= 5),
  constraint ai_coach_energy_range check (energy >= 1 and energy <= 5),
  constraint ai_coach_sleep_range check (sleep >= 1 and sleep <= 5),
  constraint ai_coach_mood_range check (mood >= 1 and mood <= 5),
  constraint ai_coach_recovery_range check (recovery >= 1 and recovery <= 5),
  constraint ai_coach_water_non_negative check (water_ml >= 0),
  constraint ai_coach_weight_non_negative check (weight_kg is null or weight_kg > 0)
);

create table if not exists ai_coach_recommendations (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  entry_date date not null,
  advice_type text not null,
  title text not null,
  message text not null,
  why_reason text not null,
  confidence numeric(5,2) not null,
  status text not null default 'pending',
  linked_meal_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_coach_advice_type_valid check (advice_type in ('daily', 'weekly', 'budget', 'shopping', 'restaurant', 'recovery')),
  constraint ai_coach_status_valid check (status in ('pending', 'accepted', 'ignored', 'replaced')),
  constraint ai_coach_confidence_valid check (confidence >= 0 and confidence <= 100)
);

create table if not exists ai_coach_feedback_events (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  recommendation_id uuid references ai_coach_recommendations(id) on delete set null,
  action text not null,
  created_at timestamptz not null default now(),
  constraint ai_coach_feedback_action_valid check (action in ('accept', 'ignore', 'replace_meal', 'regenerate'))
);

create index if not exists idx_ai_coach_daily_checkins_user_date on ai_coach_daily_checkins(user_id, entry_date desc);
create index if not exists idx_ai_coach_recommendations_user_date on ai_coach_recommendations(user_id, entry_date desc);
create index if not exists idx_ai_coach_feedback_user_created on ai_coach_feedback_events(user_id, created_at desc);

alter table ai_coach_daily_checkins enable row level security;
alter table ai_coach_recommendations enable row level security;
alter table ai_coach_feedback_events enable row level security;

create policy "AI coach checkins readable by owner" on ai_coach_daily_checkins
  for select using (auth.uid() = user_id);

create policy "AI coach checkins insertable by owner" on ai_coach_daily_checkins
  for insert with check (auth.uid() = user_id);

create policy "AI coach checkins updatable by owner" on ai_coach_daily_checkins
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "AI coach checkins deletable by owner" on ai_coach_daily_checkins
  for delete using (auth.uid() = user_id);

create policy "AI coach recommendations readable by owner" on ai_coach_recommendations
  for select using (auth.uid() = user_id);

create policy "AI coach recommendations insertable by owner" on ai_coach_recommendations
  for insert with check (auth.uid() = user_id);

create policy "AI coach recommendations updatable by owner" on ai_coach_recommendations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "AI coach recommendations deletable by owner" on ai_coach_recommendations
  for delete using (auth.uid() = user_id);

create policy "AI coach feedback readable by owner" on ai_coach_feedback_events
  for select using (auth.uid() = user_id);

create policy "AI coach feedback insertable by owner" on ai_coach_feedback_events
  for insert with check (auth.uid() = user_id);

create policy "AI coach feedback updatable by owner" on ai_coach_feedback_events
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "AI coach feedback deletable by owner" on ai_coach_feedback_events
  for delete using (auth.uid() = user_id);
