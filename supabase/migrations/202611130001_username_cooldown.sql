-- Preserve prior migrations and existing cooldown timestamps.
create or replace function private.check_username() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and new.username=old.username then return new; end if;
 new.username:=lower(btrim(new.username));
 if new.username !~ '^[a-z0-9_]{3,20}$' or exists(select 1 from private.reserved_usernames where username=new.username) then raise exception 'Invalid or reserved username'; end if;
 if TG_OP='UPDATE' and lower(new.username)<>lower(old.username) then
  if exists(select 1 from private.username_changes where profile_id=new.id and changed_at>now()-interval '30 days') then raise exception 'Username change limit: once every 30 days'; end if;
  insert into private.username_changes values(new.id,now()) on conflict(profile_id) do update set changed_at=now();
 end if;
 return new;
end $$;

create function public.username_change_status() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('next_change_at',
   (select changed_at + interval '30 days' from private.username_changes
    where profile_id=public.my_profile_id()))
$$;
revoke all on function public.username_change_status() from public,anon;
grant execute on function public.username_change_status() to authenticated;
