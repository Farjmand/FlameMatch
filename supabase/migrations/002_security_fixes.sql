-- Migration 002: security fixes
-- 1. Fix get_candidates: remove caller_id param, use auth.uid() internally
-- 2. Add get_matches_with_preview to replace the N+1 loop in matches page
-- 3. Enable storage bucket and policies (idempotent inserts)

-- ============================================================
-- Fix get_candidates: no more caller-controlled parameter
-- ============================================================

create or replace function get_candidates()
returns setof uuid language sql security definer as $$
  select p.id
  from public.profiles p
  join public.preferences pref on pref.user_id = p.id
  join public.preferences my   on my.user_id = auth.uid()
  where
    p.id <> auth.uid()
    and not exists (
      select 1 from public.swipes s
      where s.swiper_id = auth.uid() and s.swiped_id = p.id
    )
    and p.gender = any(my.interested_in)
    and (select gender from public.profiles where id = auth.uid()) = any(pref.interested_in)
    and extract(year from age(p.birth_date)) between my.age_min and my.age_max
  order by p.created_at desc
  limit 20;
$$;

-- ============================================================
-- get_matches_with_preview: single-query replacement for N+1 loop
-- ============================================================

create or replace function get_matches_with_preview()
returns table (
  match_id       uuid,
  created_at     timestamptz,
  partner_id     uuid,
  partner_name   text,
  partner_avatar text,
  latest_message text
) language sql security definer as $$
  select
    m.id,
    m.created_at,
    p.id,
    p.display_name,
    p.avatar_url,
    (
      select msg.body
      from public.messages msg
      where msg.match_id = m.id
      order by msg.created_at desc
      limit 1
    )
  from public.matches m
  join public.profiles p on p.id = case
    when m.user_a = auth.uid() then m.user_b
    else m.user_a
  end
  where m.user_a = auth.uid() or m.user_b = auth.uid()
  order by m.created_at desc;
$$;

-- ============================================================
-- Storage bucket and policies
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'avatars: owner can upload'
  ) then
    execute $p$
      create policy "avatars: owner can upload"
        on storage.objects for insert
        with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'avatars: public read'
  ) then
    execute $p$
      create policy "avatars: public read"
        on storage.objects for select
        using (bucket_id = 'avatars');
    $p$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'avatars: owner can delete'
  ) then
    execute $p$
      create policy "avatars: owner can delete"
        on storage.objects for delete
        using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
    $p$;
  end if;
end $$;
