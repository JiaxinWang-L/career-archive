-- Supabase SQL Editor 里执行这个脚本。
-- 当前公网 MVP 使用一张 app_state 表保存应用数据 JSON。
-- 这样可以最快把现有版本迁到云端；后续可以再拆成 profiles/applications/interview_rounds 等细表。

create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- 不给 anon/authenticated 任何直接访问策略。
-- 应用后端使用 SUPABASE_SERVICE_ROLE_KEY 读写这张表。
-- 这样浏览器端不会直接拿到数据库写权限。

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_state_set_updated_at on public.app_state;

create trigger app_state_set_updated_at
before update on public.app_state
for each row
execute function public.set_updated_at();

