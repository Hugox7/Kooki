-- Exécuter dans Supabase SQL Editor. Ne jamais exposer la clé service_role côté client.
create extension if not exists pgcrypto;
create table if not exists public.households (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 1 and 100),
 invite_code text not null unique default upper(encode(gen_random_bytes(8),'hex')),
 created_at timestamptz not null default now()
);
create table if not exists public.household_members (
 household_id uuid not null references public.households(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'member' check(role in ('owner','member')),
 primary key(household_id,user_id)
);
create table if not exists public.household_data (
 household_id uuid primary key references public.households(id) on delete cascade,
 payload jsonb not null default '{"items":[],"recipes":[],"shopping":[],"plans":[],"settings":{"checkupDays":7,"lastCheckup":null},"history":[]}'::jsonb,
 revision bigint not null default 0,
 updated_at timestamptz not null default now()
);
create index if not exists household_members_user_idx on public.household_members(user_id);
create or replace function public.is_household_member(hid uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.household_members where household_id=hid and user_id=(select auth.uid()))$$;
revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_data enable row level security;
drop policy if exists household_read on public.households;
create policy household_read on public.households for select to authenticated using(public.is_household_member(id));
drop policy if exists member_read on public.household_members;
create policy member_read on public.household_members for select to authenticated using(public.is_household_member(household_id));
drop policy if exists data_read on public.household_data;
create policy data_read on public.household_data for select to authenticated using(public.is_household_member(household_id));
drop policy if exists data_write on public.household_data;
create policy data_write on public.household_data for update to authenticated using(public.is_household_member(household_id)) with check(public.is_household_member(household_id));
create or replace function public.create_household(household_name text) returns uuid language plpgsql security definer set search_path='' as $$
declare hid uuid;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 if length(trim(coalesce(household_name,''))) not between 1 and 100 then raise exception 'Nom invalide'; end if;
 insert into public.households(name) values(trim(household_name)) returning id into hid;
 insert into public.household_members(household_id,user_id,role) values(hid,auth.uid(),'owner');
 insert into public.household_data(household_id) values(hid);
 return hid;
end $$;
revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;
create or replace function public.join_household(code text) returns uuid language plpgsql security definer set search_path='' as $$
declare hid uuid;
begin
 if auth.uid() is null then raise exception 'Connexion requise'; end if;
 select id into hid from public.households where invite_code=upper(trim(code));
 if hid is null then raise exception 'Code invalide'; end if;
 insert into public.household_members(household_id,user_id,role) values(hid,auth.uid(),'member') on conflict do nothing;
 return hid;
end $$;
revoke all on function public.join_household(text) from public;
grant execute on function public.join_household(text) to authenticated;
-- Activez la publication realtime de household_data depuis le dashboard Supabase si souhaité.

-- Migration des projets V0.2 déjà créés :
alter table public.household_data add column if not exists revision bigint not null default 0;

-- V0.5 : abonnements push, privés à chaque utilisateur
create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique,
 p256dh text not null,
 auth text not null,
 created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_own_read on public.push_subscriptions;
create policy push_own_read on public.push_subscriptions for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists push_own_insert on public.push_subscriptions;
create policy push_own_insert on public.push_subscriptions for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists push_own_update on public.push_subscriptions;
create policy push_own_update on public.push_subscriptions for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists push_own_delete on public.push_subscriptions;
create policy push_own_delete on public.push_subscriptions for delete to authenticated using (user_id=(select auth.uid()));
create table if not exists public.push_deliveries (
 id uuid primary key default gen_random_uuid(),
 subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
 household_id uuid not null references public.households(id) on delete cascade,
 kind text not null,
 delivery_date date not null,
 unique(subscription_id,household_id,kind,delivery_date)
);
alter table public.push_deliveries enable row level security;
-- No client policies: only the service role can read/write deliveries.
