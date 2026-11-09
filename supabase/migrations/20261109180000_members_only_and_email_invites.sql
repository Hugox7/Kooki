-- Kooki V0.13: members are authenticated users only.
-- Preserve existing legacy family-only profiles in the database for now,
-- but remove the ability to create or manage them through the API.
revoke all on function public.add_family_profile(uuid,text,text) from public, anon, authenticated;
revoke all on function public.remove_household_profile(uuid,uuid) from public, anon, authenticated;
-- Invitation email rate limit: at most 5 attempts per household per hour.
create table if not exists public.household_invite_email_attempts (
 id bigint generated always as identity primary key,
 household_id uuid not null references public.households(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index if not exists invite_email_attempts_household_time_idx
 on public.household_invite_email_attempts(household_id,created_at desc);
alter table public.household_invite_email_attempts enable row level security;
revoke all on public.household_invite_email_attempts from public, anon, authenticated;
grant select,insert on public.household_invite_email_attempts to service_role;
grant select on public.households to service_role;
grant select on public.household_members to service_role;
