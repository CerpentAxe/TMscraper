create extension if not exists "pgcrypto";

create table if not exists public.ingestion_state (
  id text primary key default 'trademarks_daily',
  last_tm_number text,
  last_run_started_at timestamptz,
  last_run_finished_at timestamptz,
  last_status text not null default 'never_run',
  last_summary jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.trademarks (
  id uuid primary key default gen_random_uuid(),
  tm_number text not null unique,
  year integer not null,
  sequence integer not null,
  application_number text,
  filing_date date,
  publication_date date,
  proprietor text,
  trademark_class text,
  goods_services text,
  representation_note text,
  pdf_url text not null,
  pdf_sha256 text,
  parsed_fields jsonb not null default '{}'::jsonb,
  raw_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trademarks_year_sequence_uniq unique (year, sequence)
);

create table if not exists public.trademark_images (
  id uuid primary key default gen_random_uuid(),
  trademark_id uuid not null references public.trademarks(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  width integer,
  height integer,
  byte_size integer,
  source_page integer,
  created_at timestamptz not null default now(),
  constraint trademark_images_bucket_path_uniq unique (storage_bucket, storage_path)
);

create index if not exists idx_trademarks_tm_number on public.trademarks(tm_number);
create index if not exists idx_trademarks_year_sequence on public.trademarks(year, sequence);
create index if not exists idx_trademark_images_trademark_id on public.trademark_images(trademark_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ingestion_state_updated_at on public.ingestion_state;
create trigger trg_ingestion_state_updated_at
before update on public.ingestion_state
for each row execute function public.set_updated_at();

drop trigger if exists trg_trademarks_updated_at on public.trademarks;
create trigger trg_trademarks_updated_at
before update on public.trademarks
for each row execute function public.set_updated_at();
