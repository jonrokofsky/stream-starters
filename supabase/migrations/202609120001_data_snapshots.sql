create table if not exists public.dataset_snapshots (
  id uuid primary key,
  dataset_key text not null check (dataset_key in ('mlb_pitchers','mlb_team_offense','mlb_hitters','mlb_hitter_rank_pool','nfl_running_backs','nfl_defense_by_position')),
  schema_version integer not null check (schema_version > 0),
  source_label text not null,
  source_timestamp timestamptz,
  ingested_at timestamptz not null default now(),
  row_count integer not null check (row_count > 0),
  checksum text not null,
  source_details jsonb not null default '{}'::jsonb,
  payload jsonb not null,
  unique (dataset_key, schema_version, checksum)
);

create table if not exists public.dataset_active_snapshots (
  dataset_key text primary key check (dataset_key in ('mlb_pitchers','mlb_team_offense','mlb_hitters','mlb_hitter_rank_pool','nfl_running_backs','nfl_defense_by_position')),
  snapshot_id uuid not null references public.dataset_snapshots(id),
  activated_at timestamptz not null default now()
);

create table if not exists public.dataset_refresh_runs (
  id bigint generated always as identity primary key,
  dataset_key text not null check (dataset_key in ('mlb_pitchers','mlb_team_offense','mlb_hitters','mlb_hitter_rank_pool','nfl_running_backs','nfl_defense_by_position')),
  status text not null check (status in ('refreshing','ready','unchanged','failed')),
  failure_stage text check (failure_stage in ('fetch','transform','validation','storage','activation')),
  error_summary text,
  snapshot_id uuid references public.dataset_snapshots(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create unique index if not exists one_running_refresh_per_dataset
  on public.dataset_refresh_runs(dataset_key)
  where status = 'refreshing';

create or replace function public.try_acquire_dataset_refresh(
  p_dataset_key text,
  p_lease_seconds integer default 300
)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.dataset_refresh_runs
  set status = 'failed',
      failure_stage = 'storage',
      error_summary = 'Refresh lease expired after an interrupted run.',
      finished_at = now()
  where dataset_key = p_dataset_key
    and status = 'refreshing'
    and started_at <= now() - make_interval(secs => greatest(p_lease_seconds, 60));

  begin
    insert into public.dataset_refresh_runs(dataset_key, status, started_at)
    values (p_dataset_key, 'refreshing', now());
    return true;
  exception when unique_violation then
    return false;
  end;
end;
$$;

alter table public.dataset_snapshots enable row level security;
alter table public.dataset_active_snapshots enable row level security;
alter table public.dataset_refresh_runs enable row level security;

create or replace function public.activate_dataset_snapshot(p_snapshot_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  candidate public.dataset_snapshots%rowtype;
begin
  select * into candidate from public.dataset_snapshots where id = p_snapshot_id;
  if not found then raise exception 'snapshot not found'; end if;

  insert into public.dataset_active_snapshots(dataset_key, snapshot_id, activated_at)
  values (candidate.dataset_key, candidate.id, now())
  on conflict (dataset_key) do update
    set snapshot_id = excluded.snapshot_id,
        activated_at = excluded.activated_at;
end;
$$;

revoke all on public.dataset_snapshots from anon, authenticated;
revoke all on public.dataset_active_snapshots from anon, authenticated;
revoke all on public.dataset_refresh_runs from anon, authenticated;
revoke all on function public.activate_dataset_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.try_acquire_dataset_refresh(text, integer) from public, anon, authenticated;
grant execute on function public.activate_dataset_snapshot(uuid) to service_role;
grant execute on function public.try_acquire_dataset_refresh(text, integer) to service_role;
