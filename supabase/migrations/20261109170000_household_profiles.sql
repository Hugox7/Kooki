-- Kooki V0.12: profiles for connected members and optional family profiles.
create table public.household_profiles (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 nickname text not null check (char_length(trim(nickname)) between 1 and 40),
 family_role text not null default 'autre' check (family_role in ('papa','maman','fils','fille','grand_pere','grand_mere','conjoint','colocataire','autre')),
 created_at timestamptz not null default now(),
 unique (household_id, user_id)
);
create index household_profiles_household_idx on public.household_profiles(household_id);
alter table public.household_profiles enable row level security;
create policy household_profiles_read on public.household_profiles for select to authenticated using (public.is_household_member(household_id));
-- Writes go through RPC functions only, to prevent forged user IDs and ownership changes.
grant select on public.household_profiles to authenticated;

create or replace function public.save_household_profile(p_household_id uuid, p_nickname text, p_family_role text, p_profile_id uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_owner boolean;
begin
 if v_uid is null or not public.is_household_member(p_household_id) then raise exception 'Accès refusé'; end if;
 if length(trim(coalesce(p_nickname,''))) not between 1 and 40 then raise exception 'Pseudo invalide'; end if;
 if p_family_role not in ('papa','maman','fils','fille','grand_pere','grand_mere','conjoint','colocataire','autre') then raise exception 'Rôle familial invalide'; end if;
 select exists(select 1 from public.household_members where household_id=p_household_id and user_id=v_uid and role='owner') into v_owner;
 if p_profile_id is null then
   insert into public.household_profiles(household_id,user_id,nickname,family_role)
   values (p_household_id,v_uid,trim(p_nickname),p_family_role)
   on conflict (household_id,user_id) do update set nickname=excluded.nickname,family_role=excluded.family_role
   returning id into v_id;
 else
   update public.household_profiles set nickname=trim(p_nickname),family_role=p_family_role
   where id=p_profile_id and household_id=p_household_id and (user_id=v_uid or (user_id is null and v_owner))
   returning id into v_id;
   if v_id is null then raise exception 'Modification interdite'; end if;
 end if;
 return v_id;
end $$;

create or replace function public.add_family_profile(p_household_id uuid, p_nickname text, p_family_role text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if not exists(select 1 from public.household_members where household_id=p_household_id and user_id=auth.uid() and role='owner') then raise exception 'Réservé au propriétaire'; end if;
 if length(trim(coalesce(p_nickname,''))) not between 1 and 40 then raise exception 'Pseudo invalide'; end if;
 if p_family_role not in ('papa','maman','fils','fille','grand_pere','grand_mere','conjoint','colocataire','autre') then raise exception 'Rôle familial invalide'; end if;
 insert into public.household_profiles(household_id,user_id,nickname,family_role) values(p_household_id,null,trim(p_nickname),p_family_role) returning id into v_id;
 return v_id;
end $$;

create or replace function public.remove_household_profile(p_household_id uuid, p_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.household_members where household_id=p_household_id and user_id=auth.uid() and role='owner') then raise exception 'Réservé au propriétaire'; end if;
 delete from public.household_profiles where household_id=p_household_id and id=p_profile_id and user_id is null;
 if not found then raise exception 'Seuls les profils sans compte peuvent être supprimés ici'; end if;
end $$;

create or replace function public.remove_household_member(p_household_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.household_members where household_id=p_household_id and user_id=auth.uid() and role='owner') then raise exception 'Réservé au propriétaire'; end if;
 if p_user_id=auth.uid() then raise exception 'Le propriétaire ne peut pas se retirer lui-même'; end if;
 if exists(select 1 from public.household_members where household_id=p_household_id and user_id=p_user_id and role='owner') then raise exception 'Impossible de retirer un propriétaire'; end if;
 delete from public.household_members where household_id=p_household_id and user_id=p_user_id and role='member';
 delete from public.household_profiles where household_id=p_household_id and user_id=p_user_id;
end $$;

-- Existing connected members receive an initial profile (no email exposed to others).
insert into public.household_profiles(household_id,user_id,nickname,family_role)
select hm.household_id,hm.user_id,'Membre ' || left(hm.user_id::text,6),'autre'
from public.household_members hm
on conflict (household_id,user_id) do nothing;

revoke all on function public.save_household_profile(uuid,text,text,uuid) from public,anon;
revoke all on function public.add_family_profile(uuid,text,text) from public,anon;
revoke all on function public.remove_household_profile(uuid,uuid) from public,anon;
revoke all on function public.remove_household_member(uuid,uuid) from public,anon;
grant execute on function public.save_household_profile(uuid,text,text,uuid) to authenticated;
grant execute on function public.add_family_profile(uuid,text,text) to authenticated;
grant execute on function public.remove_household_profile(uuid,uuid) to authenticated;
grant execute on function public.remove_household_member(uuid,uuid) to authenticated;
