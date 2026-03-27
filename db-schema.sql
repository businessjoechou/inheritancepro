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
