# Implementation Plan: FlameMatch — Preference-Based Dating App

## Overview

**FlameMatch** is a brand-new, standalone Tinder-style matchmaking app where compatibility is driven by sexual orientation, gender identity, and stated preferences. Users create a profile, declare who they are and who they are looking for, then swipe through a card stack of compatible candidates. A mutual like becomes a **match**, unlocking a private real-time chat between the two people.

**Stack:** Next.js 16 App Router · Supabase (Auth + Postgres + Storage + Realtime) · TypeScript · React 19 · Tailwind CSS

---

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Auth | Supabase Auth (email + OAuth) | Handles sessions, JWTs, and RLS out of the box |
| Media storage | Supabase Storage bucket `avatars` | Co-located with DB; RLS policy mirrors profile ownership |
| Matching query | Postgres RPC `get_candidates()` | Complex exclusion + compatibility logic belongs in DB, not client |
| Realtime chat | Supabase Realtime channels | No extra service; available on the shared Supabase client |
| Swipe UI | CSS transforms + pointer events, no external lib | Keeps bundle small; swipe interaction is simple enough |
| Routing | App Router pages: `/`, `/onboarding`, `/discover`, `/matches`, `/matches/[id]`, `/settings` | Standard App Router conventions for Next.js 16 |
| Preference model | Separate `preferences` table linked 1-to-1 to `profiles` | Keeps discovery query clean and easy to extend |
| Styling | Tailwind CSS | Utility-first; fast to prototype card and swipe UI |

---

## Database Schema

```sql
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
```

### Compatibility RPC

```sql
-- Returns up to 20 candidate profile ids compatible with the calling user
create or replace function get_candidates(caller_id uuid)
returns setof uuid language sql security definer as $$
  select p.id
  from public.profiles p
  join public.preferences pref on pref.user_id = p.id
  join public.preferences my   on my.user_id = caller_id
  where
    p.id <> caller_id
    -- caller has not already swiped this person
    and not exists (
      select 1 from public.swipes s
      where s.swiper_id = caller_id and s.swiped_id = p.id
    )
    -- candidate's gender is in caller's interested_in list
    and p.gender = any(my.interested_in)
    -- caller's gender is in candidate's interested_in list
    and (select gender from public.profiles where id = caller_id) = any(pref.interested_in)
    -- apply caller's age preference to candidate
    and extract(year from age(p.birth_date)) between my.age_min and my.age_max
  order by p.created_at desc
  limit 20;
$$;
```

---

## Dependency Graph

```
Supabase schema (tables + RPC + RLS)
        │
        ├── Auth: signup / login / session cookies
        │       │
        │       └── Middleware: protected route guard + onboarding redirect
        │               │
        │               └── Onboarding wizard (profile → preferences → photo)
        │                       │
        │                       └── Discover page (card stack + swipe API)
        │                               │
        │                               └── Match detection + Matches list
        │                                       │
        │                                       └── Real-time chat
        │
        └── Settings page (edit profile / preferences / photos)
```

Implementation follows this graph bottom-up.

---

## Task List

### Phase 1: Foundation

- [ ] Task 1: Supabase schema, RPC, and RLS
- [ ] Task 2: Next.js project scaffolding and Tailwind setup
- [ ] Task 3: Auth — sign up and log in pages
- [ ] Task 4: Session middleware and protected route guard

---

### Checkpoint A — Foundation
- [ ] Schema applied; RLS blocks cross-user reads
- [ ] User can sign up, log in, and log out
- [ ] Unauthenticated visit to `/discover` redirects to `/login`

---

### Phase 2: Onboarding

- [ ] Task 5: Onboarding wizard — step 1: basic info (name, birth date, gender)
- [ ] Task 6: Onboarding wizard — step 2: preferences (orientation, interested-in, age range)
- [ ] Task 7: Onboarding wizard — step 3: photo upload to Supabase Storage
- [ ] Task 8: Redirect new users without a profile to `/onboarding`

---

### Checkpoint B — Onboarding
- [ ] New user completes full wizard and lands on `/discover`
- [ ] `profiles`, `preferences`, and `photos` rows all exist in DB
- [ ] Returning users with a complete profile skip onboarding

---

### Phase 3: Discovery & Swipe

- [ ] Task 9:  Discover page — fetch candidate stack via `get_candidates` RPC
- [ ] Task 10: Card stack UI — photo, name, age, bio rendered on top card
- [ ] Task 11: Swipe gesture — like / dislike recorded to `swipes` table
- [ ] Task 12: Empty state and stack reload when candidates run out

---

### Checkpoint C — Swipe
- [ ] Cards show real profiles from DB
- [ ] Swiping records a row in `swipes`; already-swiped profiles never re-appear
- [ ] Empty state shown when stack is exhausted

---

### Phase 4: Matching

- [ ] Task 13: Match detection — after a right-swipe, check for reverse like; insert into `matches` if mutual
- [ ] Task 14: Match toast / animation shown immediately when mutual match detected
- [ ] Task 15: Matches list page (`/matches`) with partner avatar + latest message preview

---

### Checkpoint D — Matching
- [ ] Mutual likes produce exactly one `matches` row
- [ ] Match toast fires within the same swipe interaction
- [ ] `/matches` lists all matched users

---

### Phase 5: Real-Time Chat

- [ ] Task 16: Chat page (`/matches/[id]`) — load last 50 messages; verify user is a match member
- [ ] Task 17: Send message — insert into `messages`; optimistic UI update
- [ ] Task 18: Supabase Realtime subscription — new messages pushed to both parties instantly

---

### Checkpoint E — Chat
- [ ] Both matched users can send and receive messages in real time
- [ ] Non-members are blocked by RLS (403 / redirect)
- [ ] Subscription cleaned up on page unmount

---

### Phase 6: Settings & Polish

- [ ] Task 19: Settings page — edit name, bio, gender, orientation, age range
- [ ] Task 20: Photo management — add, delete, reorder photos (up to 6)
- [ ] Task 21: Global nav bar — Discover / Matches (with unread badge) / Settings

---

### Checkpoint F — Launch Ready
- [ ] All checkpoints A–E pass
- [ ] `npm run build` exits 0, no TypeScript errors
- [ ] `npm run lint` exits 0
- [ ] Full golden path: sign up → onboard → swipe → match toast → chat → edit settings

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Supabase RLS misconfiguration exposes private data | High | Write RLS policies before any UI; test with anon key from a second user session |
| Photo upload CORS or size issues | Medium | Configure Storage bucket policy in Task 7; enforce 5 MB max client-side |
| `get_candidates` returns stale data | Low | Fetch server-side in a Server Component; call `router.refresh()` after each swipe |
| Realtime subscription leak on navigation | Medium | Always unsubscribe in `useEffect` cleanup |
| Age/date edge cases across timezones | Low | Store `birth_date` as SQL `date` (no time); compute age purely in SQL |
| Next.js 16 breaking changes vs training data | Medium | Read `node_modules/next/dist/docs/` before writing any routing or data-fetching code |

---

## Open Questions

1. **Geo-filtering** — filter candidates by country/proximity, or global pool for MVP?
2. **Moderation** — age verification or flag/report flow required?
3. **OAuth providers** — email-only for MVP, or add Google/Apple sign-in in Phase 1?
4. **Notifications** — browser push notifications for new matches/messages, or in-app only?
