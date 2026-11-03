-- All mutations go through authenticated RPCs. Public profile IDs are NOT auth IDs.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table public.industries(id text primary key, name text not null);
create table public.rooms(id uuid primary key default gen_random_uuid(),slug text unique not null,name text not null,description text not null,icon text not null,industry_id text references public.industries);
create table public.profiles(id uuid primary key default gen_random_uuid(),username text unique not null check(username ~ '^[a-zA-Z0-9_]{3,30}$'),avatar_seed text not null default 'peak',industry_id text references public.industries,profession text not null default '' check(length(profession)<=60),unemployment_status text not null default 'Prefer not to say',public_status text not null default '' check(length(public_status)<=120),allows_dm_requests boolean not null default false,onboarding_completed boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index profiles_username_lower on public.profiles(lower(username));
create table private.identities(auth_id uuid primary key references auth.users on delete cascade,profile_id uuid unique not null references public.profiles on delete cascade);
create table private.moderators(auth_id uuid primary key references auth.users on delete cascade);
create table private.restrictions(profile_id uuid primary key references public.profiles on delete cascade,reason text not null,created_at timestamptz not null default now());
create table public.blocks(user_id uuid references public.profiles on delete cascade,blocked_id uuid references public.profiles on delete cascade,created_at timestamptz not null default now(),primary key(user_id,blocked_id),check(user_id<>blocked_id));
create table public.dm_requests(id uuid primary key default gen_random_uuid(),sender_id uuid not null references public.profiles on delete cascade,recipient_id uuid not null references public.profiles on delete cascade,status text not null default 'pending' check(status in ('pending','accepted','declined')),created_at timestamptz not null default now(),check(sender_id<>recipient_id));
create unique index request_pair on public.dm_requests(least(sender_id,recipient_id),greatest(sender_id,recipient_id));
create table public.conversations(id uuid primary key default gen_random_uuid(),user_a uuid not null references public.profiles on delete cascade,user_b uuid not null references public.profiles on delete cascade,closed_at timestamptz,created_at timestamptz not null default now(),check(user_a<user_b),unique(user_a,user_b));
create table public.messages(id uuid primary key default gen_random_uuid(),room_id uuid references public.rooms on delete cascade,conversation_id uuid references public.conversations on delete cascade,sender_id uuid not null references public.profiles on delete cascade,content text not null check(length(content)<=1000),client_id uuid not null,created_at timestamptz not null default clock_timestamp(),deleted_at timestamptz,updated_at timestamptz not null default now(),check((room_id is null)<>(conversation_id is null)),unique(sender_id,client_id));
create index messages_room_cursor on public.messages(room_id,created_at desc,id desc);
create index messages_conversation_cursor on public.messages(conversation_id,created_at desc,id desc);
create index messages_sender_time on public.messages(sender_id,created_at desc);
create index requests_recipient on public.dm_requests(recipient_id,status);
create index conversations_b on public.conversations(user_b);
create index blocks_reverse on public.blocks(blocked_id,user_id);
create table public.reactions(message_id uuid references public.messages on delete cascade,user_id uuid references public.profiles on delete cascade,emoji text not null check(emoji in ('💜','😂','🫂','🎉','🔥')),primary key(message_id,user_id,emoji));
create table public.conversation_reads(conversation_id uuid references public.conversations on delete cascade,user_id uuid references public.profiles on delete cascade,last_read_at timestamptz not null default now(),primary key(conversation_id,user_id));
create table public.reports(id uuid primary key default gen_random_uuid(),reporter_id uuid references public.profiles on delete set null,target_user uuid references public.profiles on delete set null,message_id uuid references public.messages on delete set null,category text not null check(category in ('Harassment','Hate or abuse','Spam','Scam','Threats','Other')),detail text not null default '' check(length(detail)<=500),resolved boolean not null default false,created_at timestamptz not null default now());
create table private.action_events(profile_id uuid references public.profiles on delete cascade,kind text not null,created_at timestamptz not null default clock_timestamp());
create index action_events_profile on private.action_events(profile_id,created_at);

create function public.my_profile_id() returns uuid language sql stable security definer set search_path='' as $$select profile_id from private.identities where auth_id=auth.uid()$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private.moderators where auth_id=auth.uid())$$;
create function public.is_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.blocks where (user_id=a and blocked_id=b) or (user_id=b and blocked_id=a))$$;
create function public.can_converse(cid uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.conversations where id=cid and public.my_profile_id() in (user_a,user_b) and not public.is_blocked(user_a,user_b))$$;
create function public.can_read_message(mid uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.messages where id=mid and public.my_profile_id() is not null and not public.is_blocked(public.my_profile_id(),sender_id) and (room_id is not null or public.can_converse(conversation_id)))$$;

alter table public.profiles enable row level security;
alter table public.industries enable row level security;
alter table public.rooms enable row level security;
alter table public.blocks enable row level security;
alter table public.dm_requests enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reactions enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.reports enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy industries_read on public.industries for select to authenticated using (true);
create policy rooms_read on public.rooms for select to authenticated using (true);
create policy blocks_read on public.blocks for select to authenticated using (user_id=public.my_profile_id());
create policy requests_read on public.dm_requests for select to authenticated using (public.my_profile_id() in(sender_id,recipient_id) and not public.is_blocked(sender_id,recipient_id));
create policy conversations_read on public.conversations for select to authenticated using(public.can_converse(id));
create policy messages_read on public.messages for select to authenticated using(public.my_profile_id() is not null and not public.is_blocked(public.my_profile_id(),sender_id) and (room_id is not null or public.can_converse(conversation_id)));
create policy reactions_read on public.reactions for select to authenticated using(public.can_read_message(message_id));
create policy reads_read on public.conversation_reads for select to authenticated using(user_id=public.my_profile_id());
create policy reports_admin on public.reports for select to authenticated using(public.is_admin());
revoke all on all tables in schema public from anon,authenticated;
grant select on public.profiles,public.industries,public.rooms,public.blocks,public.dm_requests,public.conversations,public.messages,public.reactions,public.conversation_reads,public.reports to authenticated;

create function public.bootstrap_profile() returns jsonb language plpgsql security definer set search_path='' as $$
declare pid uuid; result public.profiles;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select profile_id into pid from private.identities where auth_id=auth.uid();
 if pid is null then
  loop
   begin
    insert into public.profiles(username,avatar_seed) values('JoblessLegend_'||substr(replace(gen_random_uuid()::text,'-',''),1,12),substr(gen_random_uuid()::text,1,8)) returning id into pid;
    exit;
   exception when unique_violation then null;
   end;
  end loop;
  insert into private.identities values(auth.uid(),pid);
 end if;
 select * into result from public.profiles where id=pid;
 return to_jsonb(result);
end $$;

-- Atomic, persistent limits and consent checks also apply to direct PostgREST calls.
create function public.mutate(action text,payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid; target uuid; mid uuid; cid uuid; rid uuid; msg public.messages; req public.dm_requests; conv public.conversations; body text; result jsonb; n integer;
begin
 me:=public.my_profile_id();
 if me is null then raise exception 'Authentication required' using errcode='28000'; end if;
 -- Serialize consent changes against requests/acceptance, then lock the sender for rate limits.
 if action in ('profile','request','respond','block','unblock','close') then perform pg_advisory_xact_lock(7912031); end if;
 perform 1 from public.profiles where id=me for update;
 if exists(select 1 from private.restrictions where profile_id=me) then raise exception 'Account restricted' using errcode='42501'; end if;
 delete from private.action_events where profile_id=me and created_at<clock_timestamp()-interval '1 minute';
 if (select count(*) from private.action_events where profile_id=me)>=120 then raise exception 'Too many actions. Try again in a minute.' using errcode='P0001'; end if;
 if action='send' then
  select * into msg from public.messages where sender_id=me and client_id=(payload->>'client_id')::uuid;
  if found then return to_jsonb(msg); end if;
  if (select count(*) from private.action_events where profile_id=me and kind='send' and created_at>clock_timestamp()-interval '10 seconds')>=5 or (select count(*) from private.action_events where profile_id=me and kind='send')>=60 then raise exception 'Message limit reached. Take a breath and try again.'; end if;
 end if;
 insert into private.action_events(profile_id,kind) values(me,action);
 case action
 when 'profile' then
  if payload - array['username','avatar_seed','industry_id','profession','unemployment_status','public_status','allows_dm_requests','onboarding_completed'] <> '{}'::jsonb then raise exception 'Unknown profile field'; end if;
  if payload ? 'unemployment_status' and payload->>'unemployment_status' not in ('Fresh graduate','Recently laid off','Searching for months','Changing careers','Taking a career break','Prefer not to say') then raise exception 'Invalid situation'; end if;
  if length(payload->>'avatar_seed')>40 then raise exception 'Invalid avatar'; end if;
  update public.profiles set username=coalesce(payload->>'username',username),avatar_seed=coalesce(payload->>'avatar_seed',avatar_seed),industry_id=case when payload?'industry_id' then payload->>'industry_id' else industry_id end,profession=coalesce(payload->>'profession',profession),unemployment_status=coalesce(payload->>'unemployment_status',unemployment_status),public_status=coalesce(payload->>'public_status',public_status),allows_dm_requests=coalesce((payload->>'allows_dm_requests')::boolean,allows_dm_requests),onboarding_completed=coalesce((payload->>'onboarding_completed')::boolean,onboarding_completed),updated_at=now() where id=me returning to_jsonb(profiles.*) into result;
 when 'send' then
  body:=btrim(payload->>'content'); rid:=(payload->>'room_id')::uuid; cid:=(payload->>'conversation_id')::uuid;
  if body is null or length(body)<1 or length(body)>1000 or (rid is null)=(cid is null) then raise exception 'Invalid message'; end if;
  select count(*) into n from regexp_matches(body,'https?://','gi'); if n>1 then raise exception 'One link per message, please.'; end if;
  if exists(select 1 from public.messages where sender_id=me and content=body and created_at>now()-interval '30 seconds') then raise exception 'Duplicate message. Give it a moment.'; end if;
  if cid is not null then
   select * into conv from public.conversations where id=cid for update;
   if not found or me not in(conv.user_a,conv.user_b) or conv.closed_at is not null or public.is_blocked(conv.user_a,conv.user_b) then raise exception 'Conversation unavailable' using errcode='42501'; end if;
  end if;
  insert into public.messages(room_id,conversation_id,sender_id,content,client_id) values(rid,cid,me,body,(payload->>'client_id')::uuid) returning to_jsonb(messages.*) into result;
 when 'delete_message' then
  mid:=(payload->>'id')::uuid;
  update public.messages set content='',deleted_at=now() where id=mid and sender_id=me returning to_jsonb(messages.*) into result;
  if result is null then raise exception 'Cannot delete this message' using errcode='42501'; end if;
 when 'react','unreact' then
  mid:=(payload->>'id')::uuid;
  if not public.can_read_message(mid) or exists(select 1 from public.messages where id=mid and deleted_at is not null) then raise exception 'Message unavailable' using errcode='42501'; end if;
  if action='react' then insert into public.reactions values(mid,me,payload->>'emoji') on conflict do nothing;
  else delete from public.reactions where message_id=mid and user_id=me and emoji=payload->>'emoji'; end if;
  update public.messages set updated_at=clock_timestamp() where id=mid;
 when 'request' then
  target:=(payload->>'recipient_id')::uuid;
  if target=me or public.is_blocked(me,target) or not exists(select 1 from public.profiles where id=target and allows_dm_requests) then raise exception 'This person is not accepting requests' using errcode='42501'; end if;
  insert into public.dm_requests(sender_id,recipient_id) values(me,target) returning to_jsonb(dm_requests.*) into result;
 when 'respond' then
  select * into req from public.dm_requests where id=(payload->>'id')::uuid for update;
  if not found or req.recipient_id<>me or req.status<>'pending' or public.is_blocked(me,req.sender_id) then raise exception 'Request unavailable' using errcode='42501'; end if;
  if payload->>'status' not in ('accepted','declined') then raise exception 'Invalid response'; end if;
  update public.dm_requests set status=payload->>'status' where id=req.id;
  if payload->>'status'='accepted' then insert into public.conversations(user_a,user_b) values(least(me,req.sender_id),greatest(me,req.sender_id)) returning to_jsonb(conversations.*) into result; end if;
 when 'block' then
  target:=(payload->>'user_id')::uuid;
  insert into public.blocks(user_id,blocked_id) values(me,target) on conflict do nothing;
  update public.dm_requests set status='declined' where status='pending' and ((sender_id=me and recipient_id=target) or(sender_id=target and recipient_id=me));
 when 'unblock' then delete from public.blocks where user_id=me and blocked_id=(payload->>'user_id')::uuid;
 when 'report' then
  target:=(payload->>'target_user')::uuid; mid:=(payload->>'message_id')::uuid;
  if target=me then raise exception 'Cannot report yourself'; end if;
  if mid is not null and (not public.can_read_message(mid) or not exists(select 1 from public.messages where id=mid and sender_id=target)) then raise exception 'Message unavailable' using errcode='42501'; end if;
  insert into public.reports(reporter_id,target_user,message_id,category,detail) values(me,target,mid,payload->>'category',coalesce(payload->>'detail','')) returning jsonb_build_object('id',id) into result;
 when 'close','read' then
  cid:=(payload->>'id')::uuid;
  if not public.can_converse(cid) then raise exception 'Conversation unavailable' using errcode='42501'; end if;
  if action='close' then update public.conversations set closed_at=now() where id=cid;
  else insert into public.conversation_reads values(cid,me,clock_timestamp()) on conflict(conversation_id,user_id) do update set last_read_at=excluded.last_read_at; end if;
 else raise exception 'Unknown action';
 end case;
 return coalesce(result,'{"ok":true}'::jsonb);
end $$;

create function public.moderate(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if payload->>'action'='hide' then update public.messages set content='',deleted_at=now() where id=(payload->>'message_id')::uuid;
 elsif payload->>'action'='restrict' then insert into private.restrictions(profile_id,reason) values((payload->>'user_id')::uuid,'Moderator review') on conflict do nothing;
 elsif payload->>'action'='resolve' then update public.reports set resolved=true where id=(payload->>'report_id')::uuid;
 else raise exception 'Unknown moderation action'; end if;
 return '{"ok":true}'::jsonb;
end $$;
create function public.admin_metrics() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 return jsonb_build_object('registered_users',(select count(*) from public.profiles),'public_messages',(select count(*) from public.messages where room_id is not null),'daily_active_senders',(select count(distinct sender_id) from public.messages where room_id is not null and created_at>now()-interval '1 day'),'monthly_active_senders',(select count(distinct sender_id) from public.messages where room_id is not null and created_at>now()-interval '30 days'),'rooms',(select jsonb_agg(t) from(select r.name,count(m.id) as messages from public.rooms r left join public.messages m on m.room_id=r.id group by r.name)t));
end $$;
-- Remove the public profile and all associated content when an Auth user is deleted.
create function private.cleanup_identity() returns trigger language plpgsql security definer set search_path='' as $$begin delete from public.profiles where id=old.profile_id; return old; end $$;
create trigger identity_deleted after delete on private.identities for each row execute function private.cleanup_identity();
revoke all on all functions in schema public from public,anon;
grant execute on function public.my_profile_id(),public.is_admin(),public.is_blocked(uuid,uuid),public.can_converse(uuid),public.can_read_message(uuid),public.bootstrap_profile(),public.mutate(text,jsonb),public.moderate(jsonb),public.admin_metrics() to authenticated;
alter publication supabase_realtime add table public.messages,public.dm_requests,public.conversations;

-- One bounded database query, rather than one Worker subrequest per conversation.
create function public.list_conversations() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(row_data order by created_at desc),'[]'::jsonb) from (
  select c.created_at,to_jsonb(c)||jsonb_build_object('a',to_jsonb(a),'b',to_jsonb(b),'unread',
    (select count(*) from public.messages m where m.conversation_id=c.id and m.sender_id<>public.my_profile_id()
     and m.created_at>coalesce((select last_read_at from public.conversation_reads r where r.conversation_id=c.id and r.user_id=public.my_profile_id()),c.created_at))) row_data
  from public.conversations c join public.profiles a on a.id=c.user_a join public.profiles b on b.id=c.user_b
  order by c.created_at desc limit 100
 ) inbox
$$;
revoke all on function public.list_conversations() from public,anon;
grant execute on function public.list_conversations() to authenticated;

-- Moderators can review only the specifically reported content through this RPC.
create function public.review_reports() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(row_data order by created_at desc),'[]'::jsonb) from (
  select r.created_at,to_jsonb(r)||jsonb_build_object('reported_content',m.content) row_data
  from public.reports r left join public.messages m on m.id=r.message_id where not r.resolved
  order by r.created_at desc limit 100
 ) queue);
end $$;
revoke all on function public.review_reports() from public,anon;
grant execute on function public.review_reports() to authenticated;
