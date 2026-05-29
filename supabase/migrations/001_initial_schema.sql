-- FlameMatch initial schema
-- Supabase Auth manages auth.users automatically

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  birth_date    date not null,
  gender        text not null, -- 'man','woman','non-binary','trans-man','trans-woman','other'
  bio           text,
  avatar_url    text,
  created_at    timestamptz default now()
);

create table public.preferences (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  orientation   text not null,   -- 'straight','gay','lesbian','bisexual','pansexual','asexual','other'
  interested_in text[] not null, -- ['man','woman','non-binary',...]
  age_min       int default 18,
  age_max       int default 99
);

create table public.photos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,
  url         text not null,
  position    int  not null default 0,
  created_at  timestamptz default now()
);

create table public.swipes (
  swiper_id   uuid references public.profiles(id) on delete cascade,
  swiped_id   uuid references public.profiles(id) on delete cascade,
  liked       boolean not null,
  created_at  timestamptz default now(),
  primary key (swiper_id, swiped_id)
);

create table public.matches (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid references public.profiles(id) on delete cascade,
  user_b      uuid references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (user_a, user_b)
);

create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid references public.matches(id) on delete cascade,
  sender_id   uuid references public.profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz default now()
);

-- ============================================================
-- RLS Policies
-- ============================================================

alter table public.profiles   enable row level security;
alter table public.preferences enable row level security;
alter table public.photos      enable row level security;
alter table public.swipes      enable row level security;
alter table public.matches     enable row level security;
alter table public.messages    enable row level security;

-- profiles: owner can do everything; others can read (needed for discovery cards)
create policy "profiles: owner full access"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles: authenticated users can read"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- preferences: owner only
create policy "preferences: owner full access"
  on public.preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- photos: owner can write; authenticated can read
create policy "photos: owner full access"
  on public.photos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "photos: authenticated users can read"
  on public.photos for select
  using (auth.role() = 'authenticated');

-- swipes: owner only (no one else needs to see raw swipes)
create policy "swipes: owner full access"
  on public.swipes for all
  using (auth.uid() = swiper_id)
  with check (auth.uid() = swiper_id);

-- matches: members can read their own matches
create policy "matches: members can read"
  on public.matches for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "matches: service role inserts"
  on public.matches for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- messages: match members can read and send
create policy "messages: match members can read"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "messages: match members can insert"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

-- ============================================================
-- Candidate discovery RPC
-- ============================================================

create or replace function get_candidates(caller_id uuid)
returns setof uuid language sql security definer as $$
  select p.id
  from public.profiles p
  join public.preferences pref on pref.user_id = p.id
  join public.preferences my   on my.user_id = caller_id
  where
    p.id <> caller_id
    and not exists (
      select 1 from public.swipes s
      where s.swiper_id = caller_id and s.swiped_id = p.id
    )
    and p.gender = any(my.interested_in)
    and (select gender from public.profiles where id = caller_id) = any(pref.interested_in)
    and extract(year from age(p.birth_date)) between my.age_min and my.age_max
  order by p.created_at desc
  limit 20;
$$;

-- ============================================================
-- Storage bucket for avatars (run via Supabase dashboard or CLI)
-- ============================================================
-- insert into storage.buckets (id, name, public)
-- values ('avatars', 'avatars', true);
--
-- create policy "avatars: owner can upload"
--   on storage.objects for insert
--   with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
--
-- create policy "avatars: public read"
--   on storage.objects for select
--   using (bucket_id = 'avatars');
