-- Additive social features. Existing identities, consent and rate limits are retained.
alter table public.messages add column reply_to_message_id uuid references public.messages(id) on delete set null;
create index messages_reply_target on public.messages(reply_to_message_id) where reply_to_message_id is not null;

create function private.validate_reply() returns trigger language plpgsql security definer set search_path='' as $$
declare original public.messages;
begin
 if new.reply_to_message_id is null then return new; end if;
 select * into original from public.messages where id=new.reply_to_message_id for share;
 if not found or original.deleted_at is not null or
   original.room_id is distinct from new.room_id or original.conversation_id is distinct from new.conversation_id or
   not public.can_read_message(original.id) then
   raise exception 'Reply target unavailable' using errcode='42501';
 end if;
 return new;
end $$;
create trigger validate_reply before insert on public.messages for each row execute function private.validate_reply();

create table public.notification_preferences(
 profile_id uuid primary key references public.profiles on delete cascade,
 replies boolean not null default true,
 requests boolean not null default true,
 private_messages boolean not null default true
);
create table public.notifications(
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references public.profiles on delete cascade,
 actor_id uuid not null references public.profiles on delete cascade,
 type text not null check(type in ('reply','request','accepted','private_message')),
 room_id uuid references public.rooms on delete cascade,
 message_id uuid references public.messages on delete cascade,
 conversation_id uuid references public.conversations on delete cascade,
 request_id uuid references public.dm_requests on delete cascade,
 event_key text not null,
 is_read boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),
 check(recipient_id<>actor_id),
 unique(recipient_id,event_key)
);
create index notifications_recipient_cursor on public.notifications(recipient_id,created_at desc,id desc);
create index notifications_unread on public.notifications(recipient_id) where not is_read;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
create policy notifications_owner on public.notifications for select to authenticated using(
 recipient_id=public.my_profile_id() and not public.is_blocked(recipient_id,actor_id)
 and (conversation_id is null or public.can_converse(conversation_id))
 and (message_id is null or public.can_read_message(message_id))
);
create policy notification_preferences_owner on public.notification_preferences for select to authenticated using(profile_id=public.my_profile_id());
revoke all on public.notifications,public.notification_preferences from public,anon,authenticated;
grant select on public.notifications,public.notification_preferences to authenticated;

create function private.notify(recipient uuid,actor uuid,kind text,event text,rid uuid default null,mid uuid default null,cid uuid default null,reqid uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare prefs public.notification_preferences;
begin
 if recipient is null or actor=recipient then return; end if;
 -- Use the underlying relation, not the caller-scoped public helper.
 if exists(select 1 from public.blocks where (user_id=actor and blocked_id=recipient) or (user_id=recipient and blocked_id=actor)) then return; end if;
 select * into prefs from public.notification_preferences where profile_id=recipient;
 if (kind='reply' and not coalesce(prefs.replies,true)) or
    (kind in ('request','accepted') and not coalesce(prefs.requests,true)) or
    (kind='private_message' and not coalesce(prefs.private_messages,true)) then return; end if;
 insert into public.notifications(recipient_id,actor_id,type,event_key,room_id,message_id,conversation_id,request_id)
 values(recipient,actor,kind,event,rid,mid,cid,reqid) on conflict(recipient_id,event_key) do nothing;
end $$;
create function private.message_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
 if new.reply_to_message_id is not null then
  select sender_id into recipient from public.messages where id=new.reply_to_message_id;
  perform private.notify(recipient,new.sender_id,'reply','reply:'||new.id,new.room_id,new.id,new.conversation_id);
 elsif new.conversation_id is not null then
  select case when user_a=new.sender_id then user_b else user_a end into recipient from public.conversations where id=new.conversation_id;
  perform private.notify(recipient,new.sender_id,'private_message','message:'||new.id,null,new.id,new.conversation_id);
 end if;
 return new;
end $$;
create trigger message_notification after insert on public.messages for each row execute function private.message_notification();
create function private.request_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform private.notify(new.recipient_id,new.sender_id,'request','request:'||new.id,null,null,null,new.id);
 return new;
end $$;
create trigger request_notification after insert on public.dm_requests for each row execute function private.request_notification();
create function private.accepted_notification() returns trigger language plpgsql security definer set search_path='' as $$
declare req public.dm_requests;
begin
 select * into req from public.dm_requests where status='accepted' and least(sender_id,recipient_id)=new.user_a and greatest(sender_id,recipient_id)=new.user_b;
 if found then perform private.notify(req.sender_id,req.recipient_id,'accepted','accepted:'||req.id,null,null,new.id,req.id); end if;
 return new;
end $$;
create trigger accepted_notification after insert on public.conversations for each row execute function private.accepted_notification();

create function public.notification_settings(payload jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=public.my_profile_id(); result jsonb;
begin
 if me is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if payload is not null then
  if jsonb_typeof(payload)<>'object' or payload-array['replies','requests','private_messages']<>'{}'::jsonb then raise exception 'Invalid preferences'; end if;
  insert into public.notification_preferences(profile_id,replies,requests,private_messages)
  values(me,coalesce((payload->>'replies')::boolean,true),coalesce((payload->>'requests')::boolean,true),coalesce((payload->>'private_messages')::boolean,true))
  on conflict(profile_id) do update set replies=excluded.replies,requests=excluded.requests,private_messages=excluded.private_messages;
 end if;
 select jsonb_build_object('replies',replies,'requests',requests,'private_messages',private_messages) into result from public.notification_preferences where profile_id=me;
 return coalesce(result,'{"replies":true,"requests":true,"private_messages":true}'::jsonb);
end $$;
create function public.read_notifications(nid uuid default null,read_value boolean default true) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=public.my_profile_id();
begin
 if me is null then raise exception 'Authentication required' using errcode='28000'; end if;
 update public.notifications set is_read=read_value where recipient_id=me and (nid is null or id=nid);
 return '{"ok":true}'::jsonb;
end $$;
revoke all on function public.notification_settings(jsonb),public.read_notifications(uuid,boolean) from public,anon;
grant execute on function public.notification_settings(jsonb),public.read_notifications(uuid,boolean) to authenticated;
revoke all on function private.validate_reply(),private.notify(uuid,uuid,text,text,uuid,uuid,uuid,uuid),private.message_notification(),private.request_notification(),private.accepted_notification() from public,anon,authenticated;
alter publication supabase_realtime add table public.notifications;

create or replace function private.mutate_internal(action text,payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid; target uuid; mid uuid; cid uuid; rid uuid; msg public.messages; req public.dm_requests; conv public.conversations; body text; result jsonb; n integer;
begin
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>8192 then raise exception 'Invalid payload'; end if;
 if action<>'profile' and payload - (case action
 when 'send' then array['content','client_id','room_id','conversation_id','reply_to_message_id']
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
  insert into public.messages(room_id,conversation_id,sender_id,content,client_id,reply_to_message_id) values(rid,cid,me,body,(payload->>'client_id')::uuid,(payload->>'reply_to_message_id')::uuid) returning to_jsonb(messages.*) into result;
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

