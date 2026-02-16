-- Olam Katan - Supabase schema
-- Run this in Supabase SQL Editor after creating a project
-- Dashboard: https://supabase.com/dashboard -> Your Project -> SQL Editor

-- Simple key-value store for app data (children, employees, age_groups, schedule)
create table if not exists app_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Allow anonymous read/write (restrict by app origin in Supabase Dashboard -> Settings -> API)
-- For single-tenant: all authenticated users of your app share the same data
alter table app_data enable row level security;

create policy "Allow all for anon"
  on app_data for all
  using (true)
  with check (true);
