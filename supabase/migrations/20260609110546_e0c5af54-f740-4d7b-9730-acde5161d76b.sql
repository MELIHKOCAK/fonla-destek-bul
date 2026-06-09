
-- 1. EXTENSIONS
create extension if not exists pgcrypto;
create extension if not exists citext;
create extension if not exists pg_trgm;

-- 2. ENUMS
create type public.campaign_status as enum (
  'draft','submitted','under_review','revision_requested','approved',
  'scheduled','live','successful','failed','cancelled','suspended',
  'payout_pending','paid_out','refunding','refunded','rejected'
);
create type public.campaign_media_type as enum ('image','video','document');
create type public.user_role as enum ('admin','moderator','reviewer','creator','backer');
create type public.review_decision as enum (
  'approved','rejected','revision_requested','suspended','reinstated'
);
create type public.contribution_status as enum (
  'pending','authorized','captured','failed','cancelled','refunded','partially_refunded'
);
create type public.payment_status as enum (
  'initiated','pending','authorized','captured','failed','cancelled','expired','refunded'
);
create type public.refund_status as enum (
  'requested','processing','succeeded','failed','cancelled'
);
create type public.payout_status as enum (
  'scheduled','processing','paid','failed','cancelled','on_hold'
);
create type public.ledger_entry_type as enum (
  'contribution_capture','contribution_refund','platform_fee','provider_fee',
  'payout','adjustment','reversal'
);
create type public.financial_environment as enum ('test','live');

-- 3. SHARED TRIGGER FUNCTIONS (no table dependency)
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create or replace function public.prevent_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'Rows in % are append-only and cannot be modified or deleted', tg_table_name
    using errcode = '42501';
end;
$$;

-- 4. IDENTITY: profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext unique,
  display_name text,
  bio text,
  avatar_path text,
  website_url text,
  location text,
  is_public boolean not null default true,
  email_notifications_enabled boolean not null default true,
  marketing_emails_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username is null or username ~ '^[a-z0-9_]{3,32}$'
  )
);
grant select, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_public_read" on public.profiles for select using (is_public = true);
create policy "profiles_self_read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- user_roles
create table public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.user_role not null,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "user_roles_self_read" on public.user_roles for select to authenticated using (auth.uid() = user_id);

-- has_role function (after user_roles exists)
create or replace function public.has_role(_user_id uuid, _role public.user_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  );
$$;

-- 5. CATEGORIES
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon_name text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories_public_read_active" on public.categories for select using (is_active = true);
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- 6. CAMPAIGNS
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete restrict,
  category_id uuid not null references public.categories(id) on delete restrict,
  title text not null,
  slug text not null unique,
  short_description text,
  story_content text,
  funds_usage_content text,
  timeline_content text,
  risks_content text,
  goal_amount_minor bigint not null,
  currency char(3) not null default 'TRY',
  start_at timestamptz,
  end_at timestamptz,
  status public.campaign_status not null default 'draft',
  submitted_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  closed_at timestamptz,
  cancellation_reason text,
  suspension_reason text,
  lock_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_goal_positive check (goal_amount_minor > 0),
  constraint campaigns_currency_try check (currency = 'TRY'),
  constraint campaigns_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint campaigns_dates_order check (start_at is null or end_at is null or end_at > start_at)
);
create index campaigns_status_idx on public.campaigns(status);
create index campaigns_category_idx on public.campaigns(category_id);
create index campaigns_creator_idx on public.campaigns(creator_id);
create index campaigns_end_at_idx on public.campaigns(end_at) where end_at is not null;
grant all on public.campaigns to service_role;
alter table public.campaigns enable row level security;
create trigger campaigns_set_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

create table public.campaign_media (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  media_type public.campaign_media_type not null,
  storage_path text,
  external_url text,
  alt_text text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaign_media_source_present check (
    storage_path is not null or external_url is not null
  )
);
create unique index campaign_media_one_cover_idx on public.campaign_media(campaign_id) where is_cover;
create index campaign_media_campaign_idx on public.campaign_media(campaign_id);
grant all on public.campaign_media to service_role;
alter table public.campaign_media enable row level security;
create trigger campaign_media_set_updated_at before update on public.campaign_media
  for each row execute function public.set_updated_at();

create table public.reward_tiers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  title text not null,
  description text,
  amount_minor bigint not null,
  quantity_limit integer,
  estimated_delivery_date date,
  shipping_required boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reward_tiers_amount_positive check (amount_minor > 0),
  constraint reward_tiers_quantity_positive check (quantity_limit is null or quantity_limit > 0)
);
create index reward_tiers_campaign_idx on public.reward_tiers(campaign_id);
grant all on public.reward_tiers to service_role;
alter table public.reward_tiers enable row level security;
create trigger reward_tiers_set_updated_at before update on public.reward_tiers
  for each row execute function public.set_updated_at();

create table public.campaign_updates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete restrict,
  title text not null,
  body_content text not null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index campaign_updates_campaign_idx on public.campaign_updates(campaign_id);
grant all on public.campaign_updates to service_role;
alter table public.campaign_updates enable row level security;
create trigger campaign_updates_set_updated_at before update on public.campaign_updates
  for each row execute function public.set_updated_at();

create table public.campaign_reviews (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  decision public.review_decision not null,
  notes text,
  from_status public.campaign_status,
  to_status public.campaign_status,
  created_at timestamptz not null default now()
);
create index campaign_reviews_campaign_idx on public.campaign_reviews(campaign_id);
grant all on public.campaign_reviews to service_role;
alter table public.campaign_reviews enable row level security;
create trigger campaign_reviews_no_update before update on public.campaign_reviews
  for each row execute function public.prevent_mutation();
create trigger campaign_reviews_no_delete before delete on public.campaign_reviews
  for each row execute function public.prevent_mutation();

create table public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, campaign_id)
);
create index favorites_campaign_idx on public.favorites(campaign_id);
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  dedupe_key text,
  created_at timestamptz not null default now()
);
create unique index notifications_dedupe_idx on public.notifications(user_id, dedupe_key) where dedupe_key is not null;
create index notifications_user_idx on public.notifications(user_id);
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

-- 7. FINANCIAL
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  backer_id uuid not null references auth.users(id) on delete restrict,
  reward_tier_id uuid references public.reward_tiers(id) on delete restrict,
  amount_minor bigint not null,
  currency char(3) not null default 'TRY',
  status public.contribution_status not null default 'pending',
  environment public.financial_environment not null default 'test',
  anonymous boolean not null default false,
  display_name_snapshot text,
  risk_acknowledged_at timestamptz,
  contact_email_encrypted text,
  shipping_address_encrypted text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contributions_amount_positive check (amount_minor > 0),
  constraint contributions_currency_try check (currency = 'TRY')
);
create index contributions_campaign_idx on public.contributions(campaign_id);
create index contributions_backer_idx on public.contributions(backer_id);
create unique index contributions_idempotency_idx on public.contributions(backer_id, idempotency_key) where idempotency_key is not null;
grant all on public.contributions to service_role;
alter table public.contributions enable row level security;
create trigger contributions_set_updated_at before update on public.contributions
  for each row execute function public.set_updated_at();

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions(id) on delete restrict,
  provider text not null,
  provider_payment_id text,
  provider_reference text,
  attempt_number integer not null default 1,
  amount_minor bigint not null,
  currency char(3) not null default 'TRY',
  status public.payment_status not null default 'initiated',
  environment public.financial_environment not null default 'test',
  sanitized_metadata jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_transactions_amount_nonneg check (amount_minor >= 0),
  constraint payment_transactions_currency_try check (currency = 'TRY')
);
create unique index payment_transactions_provider_payment_idx on public.payment_transactions(provider, provider_payment_id) where provider_payment_id is not null;
create index payment_transactions_contribution_idx on public.payment_transactions(contribution_id);
grant all on public.payment_transactions to service_role;
alter table public.payment_transactions enable row level security;
create trigger payment_transactions_set_updated_at before update on public.payment_transactions
  for each row execute function public.set_updated_at();

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_transaction_id uuid not null references public.payment_transactions(id) on delete restrict,
  contribution_id uuid not null references public.contributions(id) on delete restrict,
  amount_minor bigint not null,
  reason text,
  status public.refund_status not null default 'requested',
  provider_refund_id text,
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refunds_amount_positive check (amount_minor > 0)
);
create index refunds_contribution_idx on public.refunds(contribution_id);
grant all on public.refunds to service_role;
alter table public.refunds enable row level security;
create trigger refunds_set_updated_at before update on public.refunds
  for each row execute function public.set_updated_at();

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  creator_id uuid not null references auth.users(id) on delete restrict,
  gross_amount_minor bigint not null,
  refund_amount_minor bigint not null default 0,
  provider_fee_amount_minor bigint not null default 0,
  platform_fee_amount_minor bigint not null default 0,
  other_deduction_amount_minor bigint not null default 0,
  net_amount_minor bigint not null,
  currency char(3) not null default 'TRY',
  status public.payout_status not null default 'scheduled',
  provider_payout_id text,
  environment public.financial_environment not null default 'test',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payouts_gross_nonneg check (gross_amount_minor >= 0),
  constraint payouts_refund_nonneg check (refund_amount_minor >= 0),
  constraint payouts_provider_fee_nonneg check (provider_fee_amount_minor >= 0),
  constraint payouts_platform_fee_nonneg check (platform_fee_amount_minor >= 0),
  constraint payouts_other_nonneg check (other_deduction_amount_minor >= 0),
  constraint payouts_currency_try check (currency = 'TRY'),
  constraint payouts_net_calc check (
    net_amount_minor = gross_amount_minor - refund_amount_minor
      - provider_fee_amount_minor - platform_fee_amount_minor - other_deduction_amount_minor
  )
);
create index payouts_campaign_idx on public.payouts(campaign_id);
create index payouts_creator_idx on public.payouts(creator_id);
grant all on public.payouts to service_role;
alter table public.payouts enable row level security;
create trigger payouts_set_updated_at before update on public.payouts
  for each row execute function public.set_updated_at();

create table public.platform_fees (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete restrict,
  contribution_id uuid references public.contributions(id) on delete restrict,
  fee_rate_bps integer not null,
  fee_amount_minor bigint not null,
  calculation_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint platform_fees_rate_nonneg check (fee_rate_bps >= 0),
  constraint platform_fees_amount_nonneg check (fee_amount_minor >= 0),
  constraint platform_fees_context_present check (campaign_id is not null or contribution_id is not null)
);
create index platform_fees_campaign_idx on public.platform_fees(campaign_id);
create index platform_fees_contribution_idx on public.platform_fees(contribution_id);
grant all on public.platform_fees to service_role;
alter table public.platform_fees enable row level security;

create table public.financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete restrict,
  contribution_id uuid references public.contributions(id) on delete restrict,
  payment_transaction_id uuid references public.payment_transactions(id) on delete restrict,
  refund_id uuid references public.refunds(id) on delete restrict,
  payout_id uuid references public.payouts(id) on delete restrict,
  entry_type public.ledger_entry_type not null,
  amount_minor bigint not null,
  currency char(3) not null default 'TRY',
  environment public.financial_environment not null default 'test',
  correlation_id uuid,
  reversal_of_entry_id uuid references public.financial_ledger_entries(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ledger_currency_try check (currency = 'TRY')
);
create index ledger_campaign_idx on public.financial_ledger_entries(campaign_id);
create index ledger_correlation_idx on public.financial_ledger_entries(correlation_id);
create index ledger_entry_type_idx on public.financial_ledger_entries(entry_type);
grant all on public.financial_ledger_entries to service_role;
alter table public.financial_ledger_entries enable row level security;
create trigger ledger_no_update before update on public.financial_ledger_entries
  for each row execute function public.prevent_mutation();
create trigger ledger_no_delete before delete on public.financial_ledger_entries
  for each row execute function public.prevent_mutation();

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload_hash text not null,
  signature_valid boolean not null default false,
  processing_status text not null default 'received',
  attempt_count integer not null default 0,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  last_error text,
  constraint webhook_events_provider_event_unique unique (provider, provider_event_id)
);
create index webhook_events_status_idx on public.webhook_events(processing_status);
grant all on public.webhook_events to service_role;
alter table public.webhook_events enable row level security;

create table public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  scope text not null,
  key text not null,
  request_hash text not null,
  response_reference jsonb not null default '{}'::jsonb,
  status text not null default 'in_progress',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint idempotency_keys_scope_key_unique unique (scope, key)
);
create index idempotency_keys_expires_idx on public.idempotency_keys(expires_at);
grant all on public.idempotency_keys to service_role;
alter table public.idempotency_keys enable row level security;

-- 8. AUDIT
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  correlation_id uuid,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id);
create index audit_logs_actor_idx on public.audit_logs(actor_user_id);
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create trigger audit_logs_no_update before update on public.audit_logs
  for each row execute function public.prevent_mutation();
create trigger audit_logs_no_delete before delete on public.audit_logs
  for each row execute function public.prevent_mutation();

-- 9. SEED CATEGORIES
insert into public.categories (name, slug, description, sort_order) values
  ('Teknoloji',      'teknoloji',     'Yazılım, donanım ve yenilikçi teknoloji projeleri', 10),
  ('Tasarım',        'tasarim',       'Endüstriyel tasarım, ürün tasarımı ve yaratıcı objeler', 20),
  ('Oyun',           'oyun',          'Dijital ve masaüstü oyun projeleri', 30),
  ('Film & Video',   'film-video',    'Kısa film, belgesel ve video projeleri', 40),
  ('Müzik',          'muzik',         'Albüm, EP, konser ve müzik prodüksiyonu', 50),
  ('Yayıncılık',     'yayincilik',    'Kitap, dergi ve bağımsız yayın projeleri', 60),
  ('Sanat',          'sanat',         'Görsel sanatlar, sergiler ve sanatsal üretimler', 70),
  ('Yemek & İçecek', 'yemek-icecek',  'Gastronomi, üretim ve yerel lezzet projeleri', 80),
  ('Topluluk',       'topluluk',      'Toplumsal fayda ve topluluk odaklı girişimler', 90)
on conflict (slug) do nothing;
