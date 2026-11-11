-- Additive account/profile extension. Existing IDs, rooms and messages are preserved.
create table public.profile_details (
 profile_id uuid primary key references public.profiles on delete cascade,
 display_name text not null default '' check(length(display_name)<=40),
 bio text not null default '' check(length(bio)<=300),
 mood text not null default '' check(mood in ('','Available to chat','Job hunting','Building something','Interview tomorrow','Taking a break','Just browsing')),
 visibility text not null default 'members' check(visibility in ('public','members','private')),
 avatar_path text, banner_path text,
 updated_at timestamptz not null default now()
);
create table public.employment_profiles (
 profile_id uuid primary key references public.profiles on delete cascade,
 status text not null default 'Prefer not to say' check(status in ('Currently unemployed','Looking for a job','Recently laid off','Fresh graduate','Employed, but exploring','Changing careers','Taking a career break','Prefer not to say')),
 show_status boolean not null default false,
 show_history boolean not null default false
);
create table public.unemployment_periods (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.profiles on delete cascade,
 start_month date not null check(extract(day from start_month)=1),
 end_month date check(extract(day from end_month)=1),
 note text not null default '' check(length(note)<=200),
 check(end_month is null or end_month>=start_month)
);
create index unemployment_owner on public.unemployment_periods(profile_id,start_month);
create table public.professions (
 id text primary key, industry_id text not null references public.industries,
 name text not null, unique(industry_id,name)
);
create table private.username_changes(profile_id uuid primary key references public.profiles on delete cascade, changed_at timestamptz not null);
create table private.reserved_usernames(username text primary key);
insert into private.reserved_usernames values ('admin'),('administrator'),('support'),('moderator'),('peakunemployment'),('official'),('system');

create function public.profile_visible(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select pid=public.my_profile_id() or exists(select 1 from public.profile_details d where d.profile_id=pid and (d.visibility='public' or (d.visibility='members' and public.my_profile_id() is not null)))
$$;
revoke all on function public.profile_visible(uuid) from public;
grant execute on function public.profile_visible(uuid) to anon,authenticated;
alter table public.profile_details enable row level security;
alter table public.employment_profiles enable row level security;
alter table public.unemployment_periods enable row level security;
alter table public.professions enable row level security;
create policy details_read on public.profile_details for select to anon,authenticated using(public.profile_visible(profile_id));
-- Employment preferences themselves are owner-only; public disclosure uses a projected RPC.
create policy employment_owner on public.employment_profiles for select to authenticated using(profile_id=public.my_profile_id());
create policy periods_owner on public.unemployment_periods for select to authenticated using(profile_id=public.my_profile_id());
create policy professions_read on public.professions for select to authenticated using(true);
revoke all on public.profile_details,public.employment_profiles,public.unemployment_periods,public.professions from anon,authenticated;
grant select on public.profile_details to anon,authenticated;
grant select on public.employment_profiles,public.unemployment_periods,public.professions to authenticated;
revoke all on private.username_changes,private.reserved_usernames from public,anon,authenticated;

create function private.check_username() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='UPDATE' and new.username=old.username then return new; end if;
 new.username:=lower(btrim(new.username));
 if new.username !~ '^[a-z0-9_]{3,20}$' or exists(select 1 from private.reserved_usernames where username=new.username) then raise exception 'Invalid or reserved username'; end if;
 if TG_OP='UPDATE' and lower(new.username)<>lower(old.username) then
  if exists(select 1 from private.username_changes where profile_id=new.id and changed_at>now()-interval '7 days') then raise exception 'Username change limit: once every 7 days'; end if;
  insert into private.username_changes values(new.id,now()) on conflict(profile_id) do update set changed_at=now();
 end if;
 return new;
end $$;
-- Existing handles are grandfathered. Only newly claimed/changed handles follow the new rule.
create trigger username_rules before insert or update of username on public.profiles for each row execute function private.check_username();

create function public.account_action(action text,payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid; result jsonb; candidate text; item uuid; s date; e date;
begin
 me:=public.my_profile_id();
 if me is null then raise exception 'Authentication required' using errcode='28000'; end if;
 perform 1 from public.profiles where id=me for update;
 if exists(select 1 from private.restrictions where profile_id=me) then raise exception 'Account restricted' using errcode='42501'; end if;
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>8192 then raise exception 'Invalid payload'; end if;
 delete from private.action_events where profile_id=me and created_at<clock_timestamp()-interval '1 minute';
 if (select count(*) from private.action_events where profile_id=me)>=120 then raise exception 'Rate limit reached'; end if;
 insert into private.action_events(profile_id,kind) values(me,'account');
 if action='details' then
  if payload-array['display_name','bio','mood','visibility']<>'{}'::jsonb then raise exception 'Unknown profile field'; end if;
  insert into public.profile_details(profile_id) values(me) on conflict do nothing;
  update public.profile_details set display_name=coalesce(payload->>'display_name',display_name),bio=coalesce(payload->>'bio',bio),mood=coalesce(payload->>'mood',mood),visibility=coalesce(payload->>'visibility',visibility),updated_at=now() where profile_id=me returning to_jsonb(profile_details.*) into result;
 elsif action='employment' then
  if payload-array['status','show_status','show_history']<>'{}'::jsonb then raise exception 'Unknown employment field'; end if;
  insert into public.employment_profiles(profile_id) values(me) on conflict do nothing;
  update public.employment_profiles set status=coalesce(payload->>'status',status),show_status=coalesce((payload->>'show_status')::boolean,show_status),show_history=coalesce((payload->>'show_history')::boolean,show_history) where profile_id=me returning to_jsonb(employment_profiles.*) into result;
 elsif action in ('period','delete_period') then
  if payload-array['id','start_month','end_month','note']<>'{}'::jsonb then raise exception 'Unknown period field'; end if;
  item:=(payload->>'id')::uuid;
  if item is not null and not exists(select 1 from public.unemployment_periods where id=item and profile_id=me) then raise exception 'Period unavailable' using errcode='42501'; end if;
  if action='delete_period' then delete from public.unemployment_periods where id=item and profile_id=me; return '{"ok":true}'::jsonb; end if;
  s:=(payload->>'start_month')::date;e:=(payload->>'end_month')::date;
  if s is null or s>date_trunc('month',current_date)::date or e>date_trunc('month',current_date)::date or s>e then raise exception 'Invalid month range'; end if;
  if exists(select 1 from public.unemployment_periods where profile_id=me and id<>coalesce(item,'00000000-0000-0000-0000-000000000000'::uuid) and daterange(start_month,coalesce(end_month+'1 month'::interval,'infinity'::timestamp)::date,'[)') && daterange(s,coalesce(e+'1 month'::interval,'infinity'::timestamp)::date,'[)')) then raise exception 'Periods overlap'; end if;
  if item is null and (select count(*) from public.unemployment_periods where profile_id=me)>=50 then raise exception 'History limit reached'; end if;
  insert into public.unemployment_periods(id,profile_id,start_month,end_month,note) values(coalesce(item,gen_random_uuid()),me,s,e,coalesce(payload->>'note','')) on conflict(id) do update set start_month=excluded.start_month,end_month=excluded.end_month,note=excluded.note returning to_jsonb(unemployment_periods.*) into result;
 else raise exception 'Unknown account action'; end if;
 return result;
end $$;
revoke all on function public.account_action(text,jsonb) from public,anon;
grant execute on function public.account_action(text,jsonb) to authenticated;

create function public.username_availability(candidate text) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid; suggestions text[]:='{}'; alternative text; i integer;
begin
 me:=public.my_profile_id(); if me is null then raise exception 'Authentication required' using errcode='28000'; end if;
 perform 1 from public.profiles where id=me for update;
 delete from private.action_events where profile_id=me and created_at<clock_timestamp()-interval '1 minute';
 if (select count(*) from private.action_events where profile_id=me and kind='username')>=60 then raise exception 'Username check limit reached'; end if;
 insert into private.action_events(profile_id,kind) values(me,'username');
 candidate:=lower(btrim(candidate));
 if candidate is null or candidate !~ '^[a-z0-9_]{3,20}$' or exists(select 1 from private.reserved_usernames where username=candidate) then return jsonb_build_object('username',candidate,'valid',false,'available',false,'suggestions','[]'::jsonb); end if;
 if not exists(select 1 from public.profiles where lower(username)=candidate and id<>me) then return jsonb_build_object('username',candidate,'valid',true,'available',true,'suggestions','[]'::jsonb); end if;
 for i in 1..30 loop
  alternative:=left(candidate,15)||'_'||(10+floor(random()*990)::integer)::text;
  if not alternative=any(suggestions) and not exists(select 1 from public.profiles where lower(username)=alternative) then suggestions:=array_append(suggestions,alternative); end if;
  exit when cardinality(suggestions)>=4;
 end loop;
 return jsonb_build_object('username',candidate,'valid',true,'available',false,'suggestions',to_jsonb(suggestions));
end $$;
revoke all on function public.username_availability(text) from public,anon;
grant execute on function public.username_availability(text) to authenticated;

create function public.public_profile(handle text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.profiles; d public.profile_details; e public.employment_profiles; history jsonb;
begin
 select * into p from public.profiles where lower(username)=lower(handle);
 if not found or not public.profile_visible(p.id) then return null; end if;
 select * into d from public.profile_details where profile_id=p.id;
 select * into e from public.employment_profiles where profile_id=p.id;
 if e.show_history or p.id=public.my_profile_id() then select coalesce(jsonb_agg(jsonb_build_object('start_month',start_month,'end_month',end_month,'note',note) order by start_month desc),'[]'::jsonb) into history from public.unemployment_periods where profile_id=p.id; end if;
 return jsonb_build_object('id',p.id,'username',p.username,'avatar_seed',p.avatar_seed,'display_name',d.display_name,'bio',d.bio,'mood',d.mood,'avatar_path',d.avatar_path,'banner_path',d.banner_path,'industry_id',p.industry_id,'profession',p.profession,'public_status',p.public_status,'allows_dm_requests',p.allows_dm_requests,'created_at',p.created_at,'employment_status',case when e.show_status or p.id=public.my_profile_id() then e.status else null end,'history',history);
end $$;
revoke all on function public.public_profile(text) from public;
grant execute on function public.public_profile(text) to anon,authenticated;

create or replace function public.bootstrap_profile() returns jsonb language plpgsql security definer set search_path='' as $$
declare pid uuid; result public.profiles;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select profile_id into pid from private.identities where auth_id=auth.uid();
 if pid is null then
  loop
   begin
    insert into public.profiles(username,avatar_seed) values('member_'||substr(replace(gen_random_uuid()::text,'-',''),1,12),substr(gen_random_uuid()::text,1,8)) returning id into pid;
    exit;
   exception when unique_violation then null;
   end;
  end loop;
  insert into private.identities values(auth.uid(),pid);
 end if;
 select * into result from public.profiles where id=pid;
 return to_jsonb(result);
end $$;

-- Account verification also applies when clients bypass the Worker and call RPCs.
create function private.verified_account() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u where u.id=auth.uid() and (coalesce((to_jsonb(u)->>'is_anonymous')::boolean,false) or (to_jsonb(u)->>'email_confirmed_at') is not null))
$$;
create or replace function public.my_profile_id() returns uuid language sql stable security definer set search_path='' as $$select profile_id from private.identities where auth_id=auth.uid() and private.verified_account()$$;
alter function public.bootstrap_profile() rename to bootstrap_profile_internal;
alter function public.bootstrap_profile_internal() set schema private;
revoke all on function private.bootstrap_profile_internal() from public,anon,authenticated;
create function public.bootstrap_profile() returns jsonb language plpgsql security definer set search_path='' as $$
declare p jsonb;
begin
 if not private.verified_account() then raise exception 'Verify your email first' using errcode='42501'; end if;
 p:=private.bootstrap_profile_internal();
 insert into public.profile_details(profile_id) values((p->>'id')::uuid) on conflict do nothing;
 return p;
end $$;
revoke all on function public.bootstrap_profile() from public,anon;
grant execute on function public.bootstrap_profile() to authenticated;

-- Move legacy situation values into owner-only storage; old API writes remain compatible.
insert into public.employment_profiles(profile_id,status)
select id,case when unemployment_status='Searching for months' then 'Looking for a job' else unemployment_status end from public.profiles
on conflict do nothing;
update public.profiles set unemployment_status='Prefer not to say';
alter function public.mutate(text,jsonb) rename to mutate_internal;
alter function public.mutate_internal(text,jsonb) set schema private;
revoke all on function private.mutate_internal(text,jsonb) from public,anon,authenticated;
create function public.mutate(action text,payload jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if public.my_profile_id() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if action='profile' and payload?'unemployment_status' then
  perform public.account_action('employment',jsonb_build_object('status',case when payload->>'unemployment_status'='Searching for months' then 'Looking for a job' else payload->>'unemployment_status' end));
  payload:=payload-'unemployment_status';
 end if;
 return private.mutate_internal(action,payload);
end $$;
revoke all on function public.mutate(text,jsonb) from public,anon;
grant execute on function public.mutate(text,jsonb) to authenticated;

-- Database-backed professional categories.
insert into public.industries(id,name) values('tech','Tech & Software') on conflict(id) do nothing;
insert into public.professions(id,industry_id,name) values('tech_0','tech','Software Developer') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('tech_1','tech','Frontend Developer') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('tech_2','tech','Backend Developer') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('tech_3','tech','QA Engineer') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('tech_4','tech','Data Analyst') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('tech_5','tech','Other Tech Role') on conflict do nothing;
insert into public.industries(id,name) values('design','Design & Creative') on conflict(id) do nothing;
insert into public.professions(id,industry_id,name) values('design_0','design','Product Designer') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('design_1','design','Graphic Designer') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('design_2','design','Illustrator') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('design_3','design','Writer') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('design_4','design','Other Creative Role') on conflict do nothing;
insert into public.industries(id,name) values('business','Business & Finance') on conflict(id) do nothing;
insert into public.professions(id,industry_id,name) values('business_0','business','Accountant') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('business_1','business','Financial Analyst') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('business_2','business','Operations') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('business_3','business','Other Business Role') on conflict do nothing;
insert into public.industries(id,name) values('marketing','Marketing & Sales') on conflict(id) do nothing;
insert into public.professions(id,industry_id,name) values('marketing_0','marketing','Marketer') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('marketing_1','marketing','Sales Representative') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('marketing_2','marketing','Content Strategist') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('marketing_3','marketing','Other Marketing Role') on conflict do nothing;
insert into public.industries(id,name) values('healthcare','Healthcare') on conflict(id) do nothing;
insert into public.professions(id,industry_id,name) values('healthcare_0','healthcare','Nurse') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('healthcare_1','healthcare','Clinician') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('healthcare_2','healthcare','Administrator') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('healthcare_3','healthcare','Other Healthcare Role') on conflict do nothing;
insert into public.industries(id,name) values('education','Education') on conflict(id) do nothing;
insert into public.professions(id,industry_id,name) values('education_0','education','Teacher') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('education_1','education','Researcher') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('education_2','education','Tutor') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('education_3','education','Other Education Role') on conflict do nothing;
insert into public.industries(id,name) values('engineering','Engineering') on conflict(id) do nothing;
insert into public.professions(id,industry_id,name) values('engineering_0','engineering','Civil Engineer') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('engineering_1','engineering','Mechanical Engineer') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('engineering_2','engineering','Electrical Engineer') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('engineering_3','engineering','Other Engineering Role') on conflict do nothing;
insert into public.industries(id,name) values('other','Other Careers') on conflict(id) do nothing;
insert into public.professions(id,industry_id,name) values('other_0','other','Exploring options') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('other_1','other','Other') on conflict do nothing;
insert into public.industries(id,name) values('support','Customer Support') on conflict(id) do nothing;
insert into public.professions(id,industry_id,name) values('support_0','support','Customer Support Specialist') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('support_1','support','Customer Success') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('support_2','support','Technical Support') on conflict do nothing;
insert into public.professions(id,industry_id,name) values('support_3','support','Other Support Role') on conflict do nothing;
create function public.complete_onboarding(payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if payload?'start_month' and payload->>'start_month' is not null then
  if payload->>'unemployment_status'<>'Currently unemployed' then raise exception 'Start month applies to current unemployment'; end if;
  perform public.account_action('period',jsonb_build_object('start_month',payload->>'start_month','end_month',null,'note',''));
 end if;
 perform public.account_action('employment',jsonb_build_object('show_status',coalesce((payload->>'show_employment')::boolean,false),'show_history',coalesce((payload->>'show_employment')::boolean,false)));
 result:=public.mutate('profile',(payload-array['start_month','show_employment'])||'{"onboarding_completed":true}'::jsonb);
 return result;
end $$;
revoke all on function public.complete_onboarding(jsonb) from public,anon;
grant execute on function public.complete_onboarding(jsonb) to authenticated;
insert into public.rooms(slug,name,description,icon,industry_id) values('support','Customer Support','A conversation where you don’t have to open a ticket.','◌','support') on conflict(slug) do nothing;
alter table public.profile_details add constraint display_name_no_controls check(display_name !~ '[[:cntrl:]]');

alter policy profiles_read on public.profiles using (public.my_profile_id() is not null);
