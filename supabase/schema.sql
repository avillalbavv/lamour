-- Ejecutar una vez en el SQL Editor del proyecto Supabase de L'Amour.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  phone text not null,
  full_name text not null,
  age_confirmed boolean not null default false check (age_confirmed = true),
  age_confirmed_at timestamptz not null,
  terms_version text not null,
  privacy_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id and age_confirmed = true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if coalesce((new.raw_user_meta_data ->> 'age_confirmed')::boolean, false) is not true then
    raise exception 'La cuenta requiere confirmación de mayoría de edad';
  end if;
  insert into public.profiles (
    id, email, phone, full_name, age_confirmed, age_confirmed_at,
    terms_version, privacy_version
  ) values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    true,
    coalesce((new.raw_user_meta_data ->> 'age_confirmed_at')::timestamptz, now()),
    coalesce(new.raw_user_meta_data ->> 'terms_version', ''),
    coalesce(new.raw_user_meta_data ->> 'privacy_version', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
