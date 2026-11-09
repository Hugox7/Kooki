-- V0.14 : codes courts de 8 caractères, générés côté serveur.
-- Les anciens codes longs sont invalidés ; aucun membre existant n'est supprimé.
create or replace function public.kooki_new_invite_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  result text := '';
  i integer;
begin
  for i in 0..7 loop
    result := result || substr(alphabet, (get_byte(bytes,i) % 32)+1, 1);
  end loop;
  return result;
end;
$$;
revoke all on function public.kooki_new_invite_code() from public, anon, authenticated;

-- Rotate old codes with a unique index; repeat in the unlikely event of a collision.
do $$
declare r record; candidate text;
begin
  for r in select id from public.households loop
    loop
      candidate := public.kooki_new_invite_code();
      begin
        update public.households set invite_code=candidate, invite_code_expires_at=now()+interval '24 hours' where id=r.id;
        exit;
      exception when unique_violation then
        null;
      end;
    end loop;
  end loop;
end $$;

alter table public.households alter column invite_code set default public.kooki_new_invite_code();

create or replace function public.get_household_invite_code(household_id uuid, regenerate boolean default false)
returns table(invite_code text, invite_code_expires_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare current_code text; current_expiry timestamptz; candidate text;
begin
  if (select auth.uid()) is null then raise exception 'Connexion requise'; end if;
  if not public.is_household_member(household_id) then raise exception 'Accès refusé'; end if;
  select h.invite_code,h.invite_code_expires_at into current_code,current_expiry
  from public.households h where h.id=household_id for update;
  if not found then raise exception 'Foyer introuvable'; end if;
  if regenerate or current_expiry<=now() then
    loop
      candidate:=public.kooki_new_invite_code();
      begin
        update public.households h set invite_code=candidate,invite_code_expires_at=now()+interval '24 hours'
        where h.id=household_id returning h.invite_code,h.invite_code_expires_at into current_code,current_expiry;
        exit;
      exception when unique_violation then null;
      end;
    end loop;
  end if;
  return query select current_code,current_expiry;
end;
$$;
revoke all on function public.get_household_invite_code(uuid,boolean) from public,anon;
grant execute on function public.get_household_invite_code(uuid,boolean) to authenticated;
