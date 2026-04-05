-- Migrate health check storage to document-style JSONB questions.
-- Safe to run on a project that already has the old relational schema.

create extension if not exists pgcrypto;

-- Ensure base tables exist.
create table if not exists public.teams (
  id         text        primary key,
  name       text        not null,
  created_at timestamptz not null default now()
);

create table if not exists public.health_checks (
  id         text        primary key,
  team_id    text        not null references public.teams(id) on delete cascade,
  name       text        not null,
  status     text        not null default 'active' check (status in ('active', 'closed')),
  questions  jsonb       not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- If the table existed before this migration, make sure document column exists.
alter table public.health_checks
  add column if not exists questions jsonb not null default '[]'::jsonb;

create table if not exists public.votes (
  id               uuid        primary key default gen_random_uuid(),
  health_check_id  text        not null references public.health_checks(id) on delete cascade,
  question_id      text        not null,
  vote             text        not null check (vote in ('happy', 'ok', 'unhappy')),
  created_at       timestamptz not null default now()
);

-- Backfill existing relational question rows into health_checks.questions JSONB.
do $$
begin
  if to_regclass('public.questions') is not null then
    update public.health_checks hc
    set questions = src.questions_json
    from (
      select
        q.health_check_id,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'id', q.id,
              'text', q.text,
              'order', q."order",
              'happyExplanation', q.happy_explanation,
              'unhappyExplanation', q.unhappy_explanation
            )
            order by q."order"
          ),
          '[]'::jsonb
        ) as questions_json
      from public.questions q
      group by q.health_check_id
    ) src
    where hc.id = src.health_check_id
      and (hc.questions is null or hc.questions = '[]'::jsonb);

    -- Remove old normalized table once data is copied.
    drop table public.questions;
  end if;
end
$$;

create index if not exists idx_health_checks_team_id on public.health_checks(team_id);
create index if not exists idx_votes_health_check_id on public.votes(health_check_id);
create index if not exists idx_votes_question_id on public.votes(question_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;

