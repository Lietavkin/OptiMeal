alter table if exists ai_coach_daily_checkins
  add column if not exists stress integer;

alter table if exists ai_coach_daily_checkins
  drop constraint if exists ai_coach_stress_range;

alter table if exists ai_coach_daily_checkins
  add constraint ai_coach_stress_range check (stress is null or (stress >= 1 and stress <= 5));

alter table if exists ai_coach_recommendations
  add column if not exists expected_benefit text;

update ai_coach_recommendations
set expected_benefit = coalesce(expected_benefit, 'Expected benefit: improved adherence and nutrition consistency over the next 24 hours.');

alter table if exists ai_coach_recommendations
  alter column expected_benefit set not null;
