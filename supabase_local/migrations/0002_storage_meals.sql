-- Ensure storage bucket and policies for meal photos

insert into storage.buckets (id, name, public, file_size_limit)
values ('meals', 'meals', true, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Meal photos are publicly readable'
  ) then
    create policy "Meal photos are publicly readable"
      on storage.objects
      for select
      using (bucket_id = 'meals');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload own meal photos'
  ) then
    create policy "Users can upload own meal photos"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'meals'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete own meal photos'
  ) then
    create policy "Users can delete own meal photos"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'meals'
        and split_part(name, '/', 1) = auth.uid()::text
      );
  end if;
end $$;
