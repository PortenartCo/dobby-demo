-- Dobby Sync V1 - isolated shopping-list pilot
-- ALREADY EXECUTED by owner on 2026-11-08 against dobby-family-sync. DO NOT RE-RUN.
-- Retained only for inspection and reconstruction in an empty database.
-- Target: project dobby-family-sync in personal Free organization.
-- Intended execution: once, with explicit target verification.
-- No fixture family identifiers, real data or credentials in this file.

begin;

create table public.dobby_sync_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  joined_at timestamptz not null default now(),
  active boolean not null default true
);

create table public.dobby_sync_grocery_items (
  id uuid primary key,
  title text not null check (length(btrim(title)) between 1 and 200),
  quantity numeric(12,2) not null default 1 check (quantity >= 0),
  unit text not null default '',
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  revision bigint not null default 1 check (revision >= 1),
  deleted_at timestamptz
);

create index dobby_sync_grocery_items_updated_idx
  on public.dobby_sync_grocery_items (updated_at, id);

create function public.dobby_sync_stamper()
returns trigger language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.revision := 1;
    new.created_at := now();
  else
    new.revision := old.revision + 1;
    new.created_at := old.created_at;
  end if;
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger dobby_sync_grocery_stamp
before insert or update on public.dobby_sync_grocery_items
for each row execute function public.dobby_sync_stamper();

alter table public.dobby_sync_members enable row level security;
alter table public.dobby_sync_grocery_items enable row level security;

revoke all on table public.dobby_sync_members from public, anon, authenticated;
revoke all on table public.dobby_sync_grocery_items from public, anon, authenticated;
grant select on table public.dobby_sync_members to authenticated;
grant select, insert, update on table public.dobby_sync_grocery_items to authenticated;

-- Membership grants are NOT made available to public clients; add two user IDs
-- manually via a trusted SQL Editor after signup (never in app code).
create policy "dobby_sync_members_self_read"
on public.dobby_sync_members for select to authenticated
using (user_id = (select auth.uid()));

create policy "dobby_sync_grocery_members_read"
on public.dobby_sync_grocery_items for select to authenticated
using (
  exists (
    select 1 from public.dobby_sync_members m
    where m.user_id = (select auth.uid()) and m.active
  )
);

create policy "dobby_sync_grocery_members_insert"
on public.dobby_sync_grocery_items for insert to authenticated
with check (
  exists (
    select 1 from public.dobby_sync_members m
    where m.user_id = (select auth.uid()) and m.active
  )
);

create policy "dobby_sync_grocery_members_update"
on public.dobby_sync_grocery_items for update to authenticated
using (
  exists (
    select 1 from public.dobby_sync_members m
    where m.user_id = (select auth.uid()) and m.active
  )
)
with check (
  exists (
    select 1 from public.dobby_sync_members m
    where m.user_id = (select auth.uid()) and m.active
  )
);

commit;

-- Security gate (apply only in same target project):
-- RLS enabled on both tables; no policy to anon.
-- Unapproved signed-in user sees zero grocery items.
-- One of the two approved users can insert/select/update only.
-- Client uses optimistic compare-and-swap:
-- UPDATE grocery SET ... WHERE id=:id AND revision=:expected_revision;
-- 0 updated rows => fetch remote, detect conflict, no blind overwrite.
-- Deletion via deleted_at tombstone, not hard delete.
