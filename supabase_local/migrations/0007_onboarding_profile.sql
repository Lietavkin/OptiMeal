alter table if exists profiles
  add column if not exists onboarding_data jsonb not null default '{}'::jsonb,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists onboarding_ai_summary text,
  add column if not exists onboarding_weekly_strategy text;
