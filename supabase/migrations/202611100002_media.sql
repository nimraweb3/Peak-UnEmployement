-- Storage has public reads, but only the validated server pipeline writes objects.
-- No authenticated INSERT/UPDATE/DELETE policy is granted on storage.objects.
do $$ begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('profile-media','profile-media',true,524288,array['image/jpeg'])
  on conflict(id) do update set public=true,file_size_limit=524288,allowed_mime_types=array['image/jpeg'];
 end if;
end $$;
create table private.media_leases(profile_id uuid primary key references public.profiles on delete cascade, token uuid not null, expires_at timestamptz not null);
revoke all on private.media_leases from public,anon,authenticated;
create function public.begin_profile_media() returns uuid language plpgsql security definer set search_path='' as $$
declare me uuid:=public.my_profile_id(); t uuid:=gen_random_uuid();
begin
 if me is null then raise exception 'Authentication required' using errcode='28000'; end if;
 perform 1 from public.profiles where id=me for update;
 if exists(select 1 from private.restrictions where profile_id=me) then raise exception 'Account restricted' using errcode='42501'; end if;
 if exists(select 1 from private.media_leases where profile_id=me and expires_at>now()) then raise exception 'Upload already in progress'; end if;
 delete from private.action_events where profile_id=me and created_at<clock_timestamp()-interval '1 minute';
 if (select count(*) from private.action_events where profile_id=me and kind='media')>=5 then raise exception 'Upload limit reached'; end if;
 insert into private.action_events(profile_id,kind) values(me,'media');
 insert into private.media_leases values(me,t,now()+interval '2 minutes') on conflict(profile_id) do update set token=t,expires_at=excluded.expires_at;
 return t;
end $$;
revoke all on function public.begin_profile_media() from public,anon;
grant execute on function public.begin_profile_media() to authenticated;
create function public.finish_profile_media(pid uuid,lease uuid,kind text,path text) returns jsonb language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 if kind not in ('avatar','banner') then raise exception 'Invalid media kind'; end if;
 perform 1 from public.profiles where id=pid for update;
 if not exists(select 1 from private.media_leases where profile_id=pid and token=lease and expires_at>now()) then raise exception 'Upload expired'; end if;
 if path is not null and path<>pid::text||'/'||kind||'/'||lease::text||'.jpg' then raise exception 'Invalid media path'; end if;
 insert into public.profile_details(profile_id) values(pid) on conflict do nothing;
 select case when kind='avatar' then avatar_path else banner_path end into previous from public.profile_details where profile_id=pid;
 update public.profile_details set avatar_path=case when kind='avatar' then path else avatar_path end,banner_path=case when kind='banner' then path else banner_path end,updated_at=now() where profile_id=pid;
 delete from private.media_leases where profile_id=pid and token=lease;
 return jsonb_build_object('previous',previous);
end $$;
revoke all on function public.finish_profile_media(uuid,uuid,text,text) from public,anon,authenticated;
do $$ begin if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.finish_profile_media(uuid,uuid,text,text) to service_role; end if; end $$;
create table private.media_cleanup(path text primary key, available_at timestamptz not null default now());
revoke all on private.media_cleanup from public,anon,authenticated;
create function private.queue_profile_media() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='DELETE' or old.avatar_path is distinct from new.avatar_path then if old.avatar_path is not null then insert into private.media_cleanup(path) values(old.avatar_path) on conflict(path) do update set available_at=now(); end if; end if;
 if TG_OP='DELETE' or old.banner_path is distinct from new.banner_path then if old.banner_path is not null then insert into private.media_cleanup(path) values(old.banner_path) on conflict(path) do update set available_at=now(); end if; end if;
 return null;
end $$;
create trigger profile_media_cleanup after update or delete on public.profile_details for each row execute function private.queue_profile_media();
create function private.queue_pending_media() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.media_cleanup(path,available_at) values(new.profile_id::text||'/avatar/'||new.token::text||'.jpg',new.expires_at+interval '1 minute'),(new.profile_id::text||'/banner/'||new.token::text||'.jpg',new.expires_at+interval '1 minute') on conflict do nothing;
 return new;
end $$;
create trigger pending_media_cleanup after insert or update on private.media_leases for each row execute function private.queue_pending_media();
create function public.media_cleanup_batch() returns table(path text) language sql security definer set search_path='' as $$
 select q.path from private.media_cleanup q where available_at<now() and not exists(select 1 from public.profile_details d where d.avatar_path=q.path or d.banner_path=q.path) order by available_at limit 100
$$;
create function public.media_cleanup_ack(paths text[]) returns void language sql security definer set search_path='' as $$delete from private.media_cleanup where path=any(paths)$$;
revoke all on function public.media_cleanup_batch(),public.media_cleanup_ack(text[]) from public,anon,authenticated;
do $$ begin if exists(select 1 from pg_roles where rolname='service_role') then grant execute on function public.media_cleanup_batch(),public.media_cleanup_ack(text[]) to service_role; end if; end $$;
-- Protect this bucket even if a project has a broad permissive Storage policy.
do $$ begin
 if to_regclass('storage.objects') is not null then
  execute 'create policy profile_media_no_direct_insert on storage.objects as restrictive for insert to authenticated with check (bucket_id <> ''profile-media'')';
  execute 'create policy profile_media_no_direct_update on storage.objects as restrictive for update to authenticated using (bucket_id <> ''profile-media'') with check (bucket_id <> ''profile-media'')';
  execute 'create policy profile_media_no_direct_delete on storage.objects as restrictive for delete to authenticated using (bucket_id <> ''profile-media'')';
 end if;
end $$;
