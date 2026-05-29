# FlameMatch — Task List

## Phase 1: Foundation

- [ ] **Task 1** — Supabase schema, RPC, and RLS
  - Create Supabase project; apply SQL migration for all 6 tables
  - Add `get_candidates(caller_id uuid)` RPC function
  - Write RLS policies: users own their rows; match members can read their chat
  - **Size:** M | **Deps:** None
  - **Files:** `supabase/migrations/001_initial_schema.sql`
  - **Verify:** Query tables with anon key from a second session; confirm cross-user read blocked

- [ ] **Task 2** — Next.js project scaffolding and Tailwind setup
  - `npx create-next-app@16 flamematch --typescript --app --tailwind`
  - Add `@supabase/supabase-js`; create `src/lib/supabase.ts` (browser client)
  - Wire `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - **Size:** S | **Deps:** Task 1
  - **Files:** `package.json`, `src/lib/supabase.ts`, `.env.local`
  - **Verify:** `npm run dev` starts; `supabase.from('profiles').select()` returns empty array (not an error)

- [ ] **Task 3** — Auth: sign up and log in pages
  - `src/app/(auth)/signup/page.tsx` — email + password form → `supabase.auth.signUp()`
  - `src/app/(auth)/login/page.tsx` — email + password form → `supabase.auth.signInWithPassword()`
  - `src/app/(auth)/logout/route.ts` — server action → `supabase.auth.signOut()` + redirect to `/login`
  - **Size:** M | **Deps:** Task 2
  - **Files:** `src/app/(auth)/signup/page.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/logout/route.ts`
  - **Verify:** Sign up creates row in `auth.users`; login sets session cookie; logout clears it

- [ ] **Task 4** — Session middleware and protected route guard
  - `src/middleware.ts` — refresh session on every request; redirect unauthenticated users from protected paths to `/login`
  - `src/lib/supabase-server.ts` — SSR Supabase client using request cookies
  - **Size:** S | **Deps:** Task 3
  - **Files:** `src/middleware.ts`, `src/lib/supabase-server.ts`
  - **Verify:** Visit `/discover` without session → redirected to `/login`; with session → passes through

---

### Checkpoint A
- [ ] Schema applied; RLS confirmed; auth works end-to-end; route guard active

---

## Phase 2: Onboarding

- [ ] **Task 5** — Onboarding step 1: basic info
  - `src/app/onboarding/page.tsx` — multi-step wizard shell with local step state
  - Step 1 form: display name, birth date, gender (inclusive select options)
  - On submit: POST to `src/app/api/profile/route.ts` → `INSERT INTO profiles`
  - **Size:** M | **Deps:** Task 4
  - **Files:** `src/app/onboarding/page.tsx`, `src/app/api/profile/route.ts`
  - **Verify:** Submitting inserts `profiles` row; wizard advances to step 2

- [ ] **Task 6** — Onboarding step 2: preferences
  - Wizard step 2: orientation select, interested-in multi-select, age range inputs
  - On submit: POST to `src/app/api/preferences/route.ts` → `INSERT INTO preferences`
  - **Size:** S | **Deps:** Task 5
  - **Files:** `src/app/api/preferences/route.ts`
  - **Verify:** `preferences` row inserted with correct `interested_in` array and age range

- [ ] **Task 7** — Onboarding step 3: photo upload
  - Wizard step 3: file input → upload to Supabase Storage `avatars/{user_id}/0.jpg`
  - On success: INSERT into `photos`; UPDATE `profiles.avatar_url`
  - **Size:** M | **Deps:** Task 5
  - **Files:** `src/app/api/photos/route.ts`, Storage bucket config
  - **Verify:** File appears in Supabase Storage; `photos` row inserted; public URL renders in `<img>`

- [ ] **Task 8** — New-user redirect to onboarding
  - In middleware: if session exists but no `profiles` row → redirect to `/onboarding`
  - After completing wizard: redirect to `/discover`
  - **Size:** XS | **Deps:** Task 4, Task 5
  - **Files:** `src/middleware.ts` (update)
  - **Verify:** Fresh signup → `/onboarding`; returning user with profile → `/discover`

---

### Checkpoint B
- [ ] Full onboarding works; profiles + preferences + photos rows all exist after completion

---

## Phase 3: Discovery & Swipe

- [ ] **Task 9** — Discover page: fetch candidate stack
  - `src/app/discover/page.tsx` (Server Component) — call `supabase.rpc('get_candidates', { caller_id })`
  - For each returned id, fetch profile + first photo
  - Pass candidate array to `<CardStack>` client component
  - **Size:** S | **Deps:** Task 1, Task 8
  - **Files:** `src/app/discover/page.tsx`
  - **Verify:** Page renders candidate list; empty state if no candidates; no error in console

- [ ] **Task 10** — Card stack UI
  - `src/components/CardStack.tsx` — renders top card from candidate array; photo, name, age, bio visible
  - `src/components/ProfileCard.tsx` — card layout using Tailwind positioning and shadow
  - **Size:** M | **Deps:** Task 9
  - **Files:** `src/components/CardStack.tsx`, `src/components/ProfileCard.tsx`
  - **Verify:** Top card shows correct candidate data; card visually styled

- [ ] **Task 11** — Swipe: like / dislike
  - Like (❤) and dislike (✕) buttons; optional left/right drag with CSS transform on pointer move
  - On action: POST to `src/app/api/swipe/route.ts` → `INSERT INTO swipes`
  - Remove swiped card from local stack state; show next card
  - **Size:** M | **Deps:** Task 10
  - **Files:** `src/app/api/swipe/route.ts`, `src/components/CardStack.tsx` (update)
  - **Verify:** Swipe inserts row in `swipes`; card animates out; next card appears

- [ ] **Task 12** — Empty state and stack reload
  - When stack empties: show "No more flames nearby 🔥" empty state
  - "Refresh" button calls `router.refresh()` to re-fetch from server
  - **Size:** XS | **Deps:** Task 11
  - **Files:** `src/components/CardStack.tsx` (update)
  - **Verify:** Empty state displayed after all cards swiped; refresh re-fetches candidates

---

### Checkpoint C
- [ ] Cards show real DB profiles; swipes recorded; no duplicates; empty state works

---

## Phase 4: Matching

- [ ] **Task 13** — Match detection after right-swipe
  - In `src/app/api/swipe/route.ts`: after inserting `liked: true`, query for reverse `liked: true` swipe
  - If mutual: `INSERT INTO matches` (enforce `user_a < user_b` for uniqueness); return `{ matched: true, matchId }`
  - **Size:** S | **Deps:** Task 11
  - **Files:** `src/app/api/swipe/route.ts` (update)
  - **Verify:** Two users mutually liking each other creates exactly one `matches` row

- [ ] **Task 14** — Match toast / animation
  - `src/components/MatchToast.tsx` — full-screen overlay with matched user's photo + "It's a Flame! 🔥"
  - Shown when swipe API returns `matched: true`; includes link to the new chat room
  - **Size:** S | **Deps:** Task 13
  - **Files:** `src/components/MatchToast.tsx`, `src/components/CardStack.tsx` (update)
  - **Verify:** Toast appears immediately after mutual swipe; "Start chatting" link goes to `/matches/[id]`

- [ ] **Task 15** — Matches list page
  - `src/app/matches/page.tsx` (Server Component) — fetch all matches for current user; include partner profile + latest message preview
  - **Size:** S | **Deps:** Task 13
  - **Files:** `src/app/matches/page.tsx`
  - **Verify:** Page lists all matches with partner name and avatar; latest message shown if any

---

### Checkpoint D
- [ ] One `matches` row per mutual pair; toast fires; `/matches` lists all matches

---

## Phase 5: Real-Time Chat

- [ ] **Task 16** — Chat page: load message history
  - `src/app/matches/[id]/page.tsx` (Server Component) — verify current user is a member of this match; load last 50 messages ordered by `created_at asc`
  - Pass messages + match data to `<ChatRoom>` client component
  - **Size:** M | **Deps:** Task 15
  - **Files:** `src/app/matches/[id]/page.tsx`, `src/components/ChatRoom.tsx`
  - **Verify:** Both matched users load the page; non-member gets redirect/403

- [ ] **Task 17** — Send message
  - `<ChatRoom>` text input + send button
  - POST to `src/app/api/messages/[matchId]/route.ts` → `INSERT INTO messages`
  - Optimistically append message to local state before response
  - **Size:** M | **Deps:** Task 16
  - **Files:** `src/app/api/messages/[matchId]/route.ts`, `src/components/ChatRoom.tsx` (update)
  - **Verify:** Sent message appears immediately in UI; row exists in `messages` table

- [ ] **Task 18** — Realtime message subscription
  - In `ChatRoom` `useEffect`: `supabase.channel('match:{id}').on('postgres_changes', …)` for new `messages` rows
  - Append incoming messages to state; unsubscribe on unmount
  - **Size:** S | **Deps:** Task 17
  - **Files:** `src/components/ChatRoom.tsx` (update)
  - **Verify:** Open chat as two users in separate browser tabs; message from tab A appears in tab B without reload

---

### Checkpoint E
- [ ] Real-time chat works bidirectionally; non-members blocked; subscription cleaned up on unmount

---

## Phase 6: Settings & Polish

- [ ] **Task 19** — Settings: edit profile and preferences
  - `src/app/settings/page.tsx` — form pre-filled with current data
  - PATCH via `src/app/api/profile/route.ts` and `src/app/api/preferences/route.ts`
  - **Size:** M | **Deps:** Task 6
  - **Files:** `src/app/settings/page.tsx`
  - **Verify:** Changes saved; updated values reflected on next discover load

- [ ] **Task 20** — Photo management
  - Settings sub-section: view existing photos, upload more (max 6), delete, reorder
  - Upload → Supabase Storage; delete → remove from Storage + `photos` table; reorder → update `position`
  - **Size:** M | **Deps:** Task 7, Task 19
  - **Files:** `src/app/settings/page.tsx` (update), `src/app/api/photos/route.ts` (update)
  - **Verify:** Add/delete/reorder all persist correctly; max-6 enforced client-side

- [ ] **Task 21** — Global nav bar
  - `src/components/Nav.tsx` — Discover · Matches (with unread count badge) · Settings links
  - Add to `src/app/layout.tsx` (only when session is active)
  - **Size:** S | **Deps:** Task 15
  - **Files:** `src/components/Nav.tsx`, `src/app/layout.tsx`
  - **Verify:** Nav appears on all authenticated pages; badge count is accurate

---

### Checkpoint F — Launch Ready
- [ ] All checkpoints A–E pass
- [ ] `npm run build` exits 0 with no TypeScript errors
- [ ] `npm run lint` exits 0
- [ ] Full golden path: sign up → onboard → swipe → match toast → chat → edit settings
