-- Dobby multi-household V2 draft. DO NOT EXECUTE against active project.
-- V1 tables remain unchanged. Test on separate personal Supabase project first.
begin;
create table public.dobby_v2_households (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(btrim(name)) between 1 and 120),
 created_at timestamptz not null default now()
);
create table public.dobby_v2_memberships (
 household_id uuid not null references public.dobby_v2_households(id),
 user_id uuid not null references auth.users(id),
 role text not null check(role in ('owner','member')),
 active boolean not null default true,
 joined_at timestamptz not null default now(),
 primary key (household_id,user_id)
);
create index dobby_v2_memberships_user_idx on public.dobby_v2_memberships(user_id,household_id) where active;
create table public.dobby_v2_grocery (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.dobby_v2_households(id),
 title text not null check(length(btrim(title)) between 1 and 200),
 quantity numeric(12,2) check(quantity is null or quantity >= 0),
 unit text not null default '',
 checked boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 revision bigint not null default 1 check(revision >= 1),
 deleted_at timestamptz,
 import_source_id uuid,
 unique(household_id,import_source_id)
);
create index dobby_v2_grocery_household_idx on public.dobby_v2_grocery(household_id,updated_at,id);
create function public.dobby_v2_grocery_stamp()
returns trigger language plpgsql set search_path = ''
as $$
begin
 if tg_op = 'UPDATE' then
  if new.id is distinct from old.id
     or new.household_id is distinct from old.household_id
     or new.import_source_id is distinct from old.import_source_id then
    raise exception 'immutable identity';
  end if;
  new.revision := old.revision + 1;
  new.created_at := old.created_at;
 else
  new.revision := 1;
  new.created_at := now();
 end if;
 new.updated_at := clock_timestamp();
 new.updated_by := auth.uid();
 return new;
end
$$;
create trigger dobby_v2_grocery_stamper before insert or update
on public.dobby_v2_grocery for each row execute function public.dobby_v2_grocery_stamp();
alter table public.dobby_v2_households enable row level security;
alter table public.dobby_v2_memberships enable row level security;
alter table public.dobby_v2_grocery enable row level security;
revoke all on public.dobby_v2_households from public,anon,authenticated;
revoke all on public.dobby_v2_memberships from public,anon,authenticated;
revoke all on public.dobby_v2_grocery from public,anon,authenticated;
grant select on public.dobby_v2_households to authenticated;
grant select on public.dobby_v2_memberships to authenticated;
grant select,insert,update on public.dobby_v2_grocery to authenticated;
-- Membership and household creation intentionally admin-only.
create policy dobby_v2_memberships_self on public.dobby_v2_memberships
for select to authenticated using(user_id=(select auth.uid()));
create policy dobby_v2_households_read on public.dobby_v2_households
for select to authenticated using(exists (
 select 1 from public.dobby_v2_memberships m
 where m.household_id=id and m.user_id=(select auth.uid()) and m.active
));
create policy dobby_v2_grocery_read on public.dobby_v2_grocery
for select to authenticated using(exists (
 select 1 from public.dobby_v2_memberships m
 where m.household_id=dobby_v2_grocery.household_id
 and m.user_id=(select auth.uid()) and m.active
));
create policy dobby_v2_grocery_add on public.dobby_v2_grocery
for insert to authenticated with check(exists (
 select 1 from public.dobby_v2_memberships m
 where m.household_id=dobby_v2_grocery.household_id
 and m.user_id=(select auth.uid()) and m.active
));
create policy dobby_v2_grocery_edit on public.dobby_v2_grocery
for update to authenticated
using(exists (
 select 1 from public.dobby_v2_memberships m
 where m.household_id=dobby_v2_grocery.household_id
 and m.user_id=(select auth.uid()) and m.active
))
with check(exists (
 select 1 from public.dobby_v2_memberships m
 where m.household_id=dobby_v2_grocery.household_id
 and m.user_id=(select auth.uid()) and m.active
));
commit;
-- No data backfill. No replacement of V1; do not run on current Dobby database.
-- V2 CAS must explicitly UPDATE WHERE household_id=... AND revision=...
