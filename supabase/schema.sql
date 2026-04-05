-- Pass 1 schema – NoSQL document-store style using Supabase / Postgres JSONB.
-- Apply in Supabase SQL Editor before running the app.
--
-- Design:
--   • teams         – one document per team
--   • health_checks – one document per check; questions embedded as JSONB array
--   • votes         – separate rows for safe concurrent inserts (no race conditions)
--
-- No separate "questions" table – questions live inside the health_check document.

create extension if not exists pgcrypto;

-- ── teams ────────────────────────────────────────────────────────────────────
create table if not exists public.teams (
  id         text        primary key,
  name       text        not null,
  created_at timestamptz not null default now()
);

-- ── health_checks ─────────────────────────────────────────────────────────────
-- "questions" is an embedded JSONB document array, e.g.:
-- [{ "id": "q_…", "text": "…", "order": 0, "happyExplanation": "…", "unhappyExplanation": "…" }]
create table if not exists public.health_checks (
  id         text        primary key,
  team_id    text        not null references public.teams(id) on delete cascade,
  name       text        not null,
  status     text        not null default 'active' check (status in ('active', 'closed')),
  questions  jsonb       not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- ── votes ─────────────────────────────────────────────────────────────────────
-- question_id references the id field inside health_checks.questions JSONB –
-- no FK constraint needed; cascades handled via health_check_id.
create table if not exists public.votes (
  id               uuid        primary key default gen_random_uuid(),
  health_check_id  text        not null references public.health_checks(id) on delete cascade,
  question_id      text        not null,
  vote             text        not null check (vote in ('happy', 'ok', 'unhappy')),
  created_at       timestamptz not null default now()
);

-- ── indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_health_checks_team_id     on public.health_checks(team_id);
create index if not exists idx_votes_health_check_id     on public.votes(health_check_id);
create index if not exists idx_votes_question_id         on public.votes(question_id);

-- ── access (no RLS in pass 1) ─────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;

