-- ============================================================
-- InheritancePro — Supabase Database Schema
-- 使用方式：貼入 Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- --------------------------------------------------------
-- 1. Profiles table
--    每位用戶註冊後自動建立，記錄 Pro 狀態
-- --------------------------------------------------------
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text,
  is_pro      boolean default false,
  pro_tier    text,
  activated_at timestamptz,
  created_at  timestamptz default now()
);

-- Row Level Security
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- --------------------------------------------------------
-- 2. Auto-create profile on new user signup
-- --------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- --------------------------------------------------------
-- 3. Redemption codes table
--    由管理員事先建立序號；用戶兌換後標記為已使用
-- --------------------------------------------------------
create table public.redemption_codes (
  id         uuid default gen_random_uuid() primary key,
  code       text unique not null,
  tier       text not null,           -- e.g. 'pro', 'pro_lifetime'
  is_used    boolean default false,
  used_by    uuid references public.profiles(id),
  used_at    timestamptz,
  created_at timestamptz default now()
);

-- Row Level Security
alter table public.redemption_codes enable row level security;

-- Any authenticated user may check (read) codes to validate them
create policy "Users can check codes"
  on public.redemption_codes for select
  using (true);

-- Only unused codes may be updated (marked as redeemed)
create policy "Users can redeem codes"
  on public.redemption_codes for update
  using (not is_used);

-- --------------------------------------------------------
-- 4. (Optional) Insert sample redemption codes for testing
--    Uncomment and adjust as needed
-- --------------------------------------------------------
-- insert into public.redemption_codes (code, tier) values
--   ('BETA2024-PROA', 'pro'),
--   ('BETA2024-PROB', 'pro'),
--   ('LIFETIME-0001', 'pro_lifetime');

-- ============================================================
-- SECURITY PATCHES
-- Run this section against existing databases to apply fixes.
-- New deployments: these are included automatically above.
-- ============================================================

-- ── 補充 profiles 缺少的欄位 ──────────────────────────────────
alter table public.profiles
  add column if not exists pro_expires_at  timestamptz,
  add column if not exists pro_source      text,
  add column if not exists pro_product_id  text,
  add column if not exists ever_pro        boolean default false;

-- ── P0-1: 修復 profiles RLS ───────────────────────────────────
-- 舊政策允許用戶直接修改 is_pro，移除後以 WITH CHECK 限制
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- 禁止直接修改 Pro 狀態欄位（只能透過 security definer RPC）
    and is_pro         = (select is_pro         from public.profiles where id = auth.uid())
    and coalesce(pro_tier, '')          = coalesce((select pro_tier         from public.profiles where id = auth.uid()), '')
    and coalesce(pro_expires_at::text, '') = coalesce((select pro_expires_at::text from public.profiles where id = auth.uid()), '')
  );

-- ── Security definer RPC：啟用 Pro（購買 / 兌換後呼叫）─────────
create or replace function public.activate_pro(
  p_tier        text,
  p_expires_at  timestamptz default null,
  p_source      text        default null,
  p_product_id  text        default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set
    is_pro         = true,
    ever_pro       = true,
    pro_tier       = p_tier,
    pro_expires_at = p_expires_at,
    pro_source     = p_source,
    pro_product_id = p_product_id,
    activated_at   = now()
  where id = v_user_id;
end;
$$;

-- ── Security definer RPC：撤銷 Pro（訂閱到期時呼叫）──────────
create or replace function public.revoke_pro()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set is_pro = false
  where id = v_user_id;
end;
$$;

-- ── P0-2: 修復 redemption_codes RLS ──────────────────────────
-- 舊政策允許任何登入用戶讀取所有序號，改為封閉直接存取
drop policy if exists "Users can check codes"  on public.redemption_codes;
drop policy if exists "Users can redeem codes" on public.redemption_codes;

create policy "No direct table access"
  on public.redemption_codes for all
  using (false);

-- ── 原子性 redeem_code RPC（含行鎖，防止重複兌換）────────────
create or replace function public.redeem_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code_data record;
  v_user_id   uuid := auth.uid();
begin
  if v_user_id is null then
    return jsonb_build_object('error', 'Not authenticated');
  end if;

  -- 加行鎖（FOR UPDATE）防止並發重複兌換
  select * into v_code_data
  from public.redemption_codes
  where code    = upper(trim(p_code))
    and is_used = false
  for update;

  if not found then
    return jsonb_build_object('error', '序號無效或已使用');
  end if;

  -- 標記序號已使用
  update public.redemption_codes
  set
    is_used = true,
    used_by = v_user_id,
    used_at = now()
  where id = v_code_data.id;

  -- 升級用戶為 Pro（codes = 永久，無到期日）
  update public.profiles
  set
    is_pro         = true,
    ever_pro       = true,
    pro_tier       = v_code_data.tier,
    pro_expires_at = null,
    pro_source     = 'code',
    activated_at   = now()
  where id = v_user_id;

  return jsonb_build_object('success', true, 'tier', v_code_data.tier);
end;
$$;
