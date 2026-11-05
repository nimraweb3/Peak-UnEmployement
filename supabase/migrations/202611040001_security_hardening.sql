-- After Hours hardening. Existing data and consent are preserved.
create index requests_sender_time on public.dm_requests(sender_id,created_at);
-- Unrelated callers must not use this policy helper as a relationship oracle.
create or replace function public.is_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.my_profile_id() in (a,b),false) and exists(select 1 from public.blocks where (user_id=a and blocked_id=b) or (user_id=b and blocked_id=a))
$$;
create or replace function public.mutate(action text,payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid; target uuid; mid uuid; cid uuid; rid uuid; msg public.messages; req public.dm_requests; conv public.conversations; body text; result jsonb; n integer;
begin
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>8192 then raise exception 'Invalid payload'; end if;
 if action<>'profile' and payload - (case action
 when 'send' then array['content','client_id','room_id','conversation_id']
 when 'delete_message' then array['id'] when 'react' then array['id','emoji'] when 'unreact' then array['id','emoji']
 when 'request' then array['recipient_id'] when 'respond' then array['id','status']
 when 'block' then array['user_id'] when 'unblock' then array['user_id']
 when 'report' then array['target_user','message_id','category','detail'] when 'close' then array['id'] when 'read' then array['id']
 else array[]::text[] end) <> '{}'::jsonb then raise exception 'Unknown field'; end if;
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
  if (select count(*) from public.dm_requests where sender_id=me and created_at>clock_timestamp()-interval '1 hour')>=10 then raise exception 'Request limit reached. Try again later.'; end if;
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

-- Minimal operator audit trail: no message bodies, emails or Auth identifiers.
create table private.moderation_events(
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references public.profiles on delete set null,
 action text not null check(action in ('hide','restrict','resolve')),
 target_id uuid,
 created_at timestamptz not null default clock_timestamp()
);
revoke all on private.moderation_events from public,anon,authenticated;
create or replace function public.moderate(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'Admin required' using errcode='42501'; end if;
 if payload->>'action'='hide' then update public.messages set content='',deleted_at=now() where id=(payload->>'message_id')::uuid;
 elsif payload->>'action'='restrict' then insert into private.restrictions(profile_id,reason) values((payload->>'user_id')::uuid,'Moderator review') on conflict do nothing;
 elsif payload->>'action'='resolve' then update public.reports set resolved=true where id=(payload->>'report_id')::uuid;
 else raise exception 'Unknown moderation action'; end if;
 insert into private.moderation_events(actor_id,action,target_id) values(public.my_profile_id(),payload->>'action',coalesce(payload->>'message_id',payload->>'user_id',payload->>'report_id')::uuid);
 return '{"ok":true}'::jsonb;
end $$;
