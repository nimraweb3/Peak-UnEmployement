-- A deliberately narrow guest surface. No new SELECT or write table grants.
-- Public posts, display nicknames and reaction counts are intentionally public.
create function public.guest_room_feed(room_slug text, before_at timestamptz default null, before_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare selected_room public.rooms; result jsonb;
begin
 if length(room_slug)>40 or (before_at is null)<>(before_id is null) then raise exception 'Invalid room or cursor'; end if;
 select * into selected_room from public.rooms where slug=room_slug;
 if not found then return null; end if;
 with recent as (
   select m.id,m.content,m.created_at,m.deleted_at,m.sender_id
   from public.messages m where m.room_id=selected_room.id and m.conversation_id is null
   and (before_at is null or (m.created_at,m.id)<(before_at,before_id))
   order by m.created_at desc,m.id desc limit 31
 ), page as (select * from recent order by created_at desc,id desc limit 30)
 select jsonb_build_object(
  'room',jsonb_build_object('id',selected_room.id,'slug',selected_room.slug,'name',selected_room.name,'description',selected_room.description),
  'items',coalesce((select jsonb_agg(jsonb_build_object(
    'id',m.id,'content',case when m.deleted_at is null then m.content else '' end,
    'created_at',m.created_at,'deleted_at',m.deleted_at,
    'author',jsonb_build_object('username',p.username,'avatar_seed',p.avatar_seed),
    'reactions',coalesce((select jsonb_agg(r) from (select emoji,count(*) as count from public.reactions where message_id=m.id group by emoji) r),'[]'::jsonb)
   ) order by m.created_at desc,m.id desc) from page m join public.profiles p on p.id=m.sender_id),'[]'::jsonb),
  'next',case when (select count(*) from recent)>30 then (select jsonb_build_object('at',created_at,'id',id) from page order by created_at,id limit 1) else null end
 ) into result;
 return result;
end $$;
revoke all on function public.guest_room_feed(text,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.guest_room_feed(text,timestamptz,uuid) to anon;
comment on function public.guest_room_feed is 'Guest-only public room projection; never returns Auth IDs, public profile IDs, DM data, settings, or reaction user IDs.';
