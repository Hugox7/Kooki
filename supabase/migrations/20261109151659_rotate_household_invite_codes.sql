-- Kooki: expiration des invitations et rotation a la demande.
-- Migration pour la base existante, sans supprimer les membres.

alter table public.households
  add column if not exists invite_code_expires_at timestamptz;

-- Invalide les codes historiques et leur attribue un delai expire.
update public.households
set invite_code_expires_at = now() - interval '1 second'
where invite_code_expires_at is null;

alter table public.households
  alter column invite_code_expires_at set default (now() + interval '24 hours'),
  alter column invite_code_expires_at set not null;

-- Consultation et rotation manuelle (regenerate=true), uniquement par un membre.
create or replace function public.get_household_invite_code(household_id uuid, regenerate boolean default false)
returns table(invite_code text, invite_code_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_code text;
  current_expiry timestamptz;
begin
  if (select auth.uid()) is null then
    raise exception 'Connexion requise';
  end if;

  if not public.is_household_member(household_id) then
    raise exception 'Accès refusé';
  end if;

  select h.invite_code, h.invite_code_expires_at
    into current_code, current_expiry
  from public.households h
  where h.id = household_id
  for update;

  if not found then
    raise exception 'Foyer introuvable';
  end if;

  if regenerate or current_expiry <= now() then
    update public.households h
    set invite_code = upper(encode(extensions.gen_random_bytes(16), 'hex')),
        invite_code_expires_at = now() + interval '24 hours'
    where h.id = household_id
    returning h.invite_code, h.invite_code_expires_at
      into current_code, current_expiry;
  end if;

  return query select current_code, current_expiry;
end;
$$;

revoke all on function public.get_household_invite_code(uuid, boolean) from public;
revoke all on function public.get_household_invite_code(uuid, boolean) from anon;
grant execute on function public.get_household_invite_code(uuid, boolean) to authenticated;

-- Verifie l'expiration cote serveur. Verrouille la ligne contre une rotation concurrente.
create or replace function public.join_household(code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Connexion requise';
  end if;

  if code is null or length(trim(code)) = 0 then
    raise exception 'Code invalide ou expiré';
  end if;

  select h.id into hid
  from public.households h
  where h.invite_code = upper(trim(code))
    and h.invite_code_expires_at > now()
  for update;

  if hid is null then
    raise exception 'Code invalide ou expiré';
  end if;

  insert into public.household_members(household_id, user_id, role)
  values (hid, (select auth.uid()), 'member')
  on conflict do nothing;

  return hid;
end;
$$;

revoke all on function public.join_household(text) from public;
revoke all on function public.join_household(text) from anon;
grant execute on function public.join_household(text) to authenticated;
