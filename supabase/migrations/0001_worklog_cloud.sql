-- Worklog 云端表结构
-- 在 Supabase Dashboard → SQL Editor 中整段执行即可（可重复执行）。
--
-- 设计要点：
--   * 一条记录就是一行；进行中的计时用 end_ms IS NULL 表示。
--   * 每个用户同时最多只有一段进行中的计时（部分唯一索引保证）。
--   * 所有行都受 RLS 保护，用户只能读写自己的数据。

-- ---------------------------------------------------------------------------
-- 表
-- ---------------------------------------------------------------------------

create table if not exists public.worklog_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  daily_goal_minutes integer not null default 480,
  -- Legacy column kept for compatibility; current UI stores the theme locally.
  theme text not null default 'light',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worklog_profiles_goal_range check (daily_goal_minutes between 60 and 960),
  constraint worklog_profiles_theme check (theme in ('light', 'dark'))
);

create table if not exists public.worklog_sessions (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  start_ms bigint not null,
  end_ms bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worklog_sessions_pkey primary key (user_id, id),
  constraint worklog_sessions_time_order check (end_ms is null or end_ms > start_ms)
);

-- 一个用户最多一段进行中的计时。
create unique index if not exists worklog_sessions_one_active_idx
  on public.worklog_sessions (user_id)
  where end_ms is null;

-- 按开始时间读取一个用户的全部记录。
create index if not exists worklog_sessions_user_start_idx
  on public.worklog_sessions (user_id, start_ms desc);

-- ---------------------------------------------------------------------------
-- updated_at 自动维护
-- ---------------------------------------------------------------------------

create or replace function public.worklog_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists worklog_profiles_touch_updated_at on public.worklog_profiles;
create trigger worklog_profiles_touch_updated_at
  before update on public.worklog_profiles
  for each row execute function public.worklog_touch_updated_at();

drop trigger if exists worklog_sessions_touch_updated_at on public.worklog_sessions;
create trigger worklog_sessions_touch_updated_at
  before update on public.worklog_sessions
  for each row execute function public.worklog_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 新用户自动创建 profile
-- ---------------------------------------------------------------------------

create or replace function public.worklog_create_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.worklog_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists worklog_on_auth_user_created on auth.users;
create trigger worklog_on_auth_user_created
  after insert on auth.users
  for each row execute function public.worklog_create_profile();

-- ---------------------------------------------------------------------------
-- 权限：只开放给已登录用户，匿名角色一律不授权
-- ---------------------------------------------------------------------------

revoke all on public.worklog_profiles from anon;
revoke all on public.worklog_sessions from anon;
grant select, insert, update, delete on public.worklog_profiles to authenticated;
grant select, insert, update, delete on public.worklog_sessions to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.worklog_profiles enable row level security;
alter table public.worklog_sessions enable row level security;

drop policy if exists "worklog_profiles_select_own" on public.worklog_profiles;
create policy "worklog_profiles_select_own"
  on public.worklog_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "worklog_profiles_insert_own" on public.worklog_profiles;
create policy "worklog_profiles_insert_own"
  on public.worklog_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "worklog_profiles_update_own" on public.worklog_profiles;
create policy "worklog_profiles_update_own"
  on public.worklog_profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "worklog_sessions_select_own" on public.worklog_sessions;
create policy "worklog_sessions_select_own"
  on public.worklog_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "worklog_sessions_insert_own" on public.worklog_sessions;
create policy "worklog_sessions_insert_own"
  on public.worklog_sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "worklog_sessions_update_own" on public.worklog_sessions;
create policy "worklog_sessions_update_own"
  on public.worklog_sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "worklog_sessions_delete_own" on public.worklog_sessions;
create policy "worklog_sessions_delete_own"
  on public.worklog_sessions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Realtime：多设备 / 多标签页实时同步
-- DELETE 事件要带上 user_id 供过滤，因此使用 replica identity full。
-- ---------------------------------------------------------------------------

alter table public.worklog_sessions replica identity full;
alter table public.worklog_profiles replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'worklog_sessions'
    ) then
      execute 'alter publication supabase_realtime add table public.worklog_sessions';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'worklog_profiles'
    ) then
      execute 'alter publication supabase_realtime add table public.worklog_profiles';
    end if;
  end if;
end;
$$;

-- 触发器函数不需要暴露成 RPC。
revoke all on function public.worklog_touch_updated_at() from public;
revoke all on function public.worklog_create_profile() from public;
