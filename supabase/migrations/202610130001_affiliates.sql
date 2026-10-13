-- Apply in Supabase SQL Editor before enabling AFFILIATE_ENABLED=true.
-- Every table and RPC is private to service_role. Public clients use the Next.js APIs.
begin;

create table public.affiliates (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null,
  code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  status text not null default 'active' check (status in ('active','blocked')),
  created_at timestamptz not null default now()
);
create table public.affiliate_otps (
  email text primary key, name text not null, code_hash text not null,
  attempts integer not null default 0, expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create table public.affiliate_auth_requests (
  id bigint generated always as identity primary key,
  email text not null, ip_hash text not null, created_at timestamptz not null default now()
);
create index affiliate_auth_email_time on public.affiliate_auth_requests(email, created_at);
create index affiliate_auth_ip_time on public.affiliate_auth_requests(ip_hash, created_at);
create table public.affiliate_sessions (
  token_hash text primary key, affiliate_id uuid not null references public.affiliates(id),
  expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index affiliate_sessions_account on public.affiliate_sessions(affiliate_id);
create table public.affiliate_clicks (
  affiliate_id uuid not null references public.affiliates(id), visitor_hash text not null,
  day date not null default (now() at time zone 'Asia/Jakarta')::date,
  primary key (affiliate_id, visitor_hash, day)
);
create table public.checkout_orders (
  id text primary key, email text not null,
  plan text not null check (plan in ('monthly','yearly')),
  amount integer not null check (amount > 0),
  affiliate_id uuid references public.affiliates(id),
  commission_percent integer not null default 30 check (commission_percent between 0 and 100),
  status text not null default 'created' check (status in ('created','paid','reversed')),
  license_delivered boolean not null default false,
  paid_at timestamptz, created_at timestamptz not null default now()
);
create table public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(), affiliate_id uuid not null references public.affiliates(id),
  amount integer not null check (amount >= 100000), debit_amount integer not null default 0 check (debit_amount >= 0),
  bank text not null, account_number text not null, account_name text not null,
  status text not null default 'pending' check (status in ('pending','paid','rejected')),
  transfer_reference text, admin_note text, created_at timestamptz not null default now(), resolved_at timestamptz
);
create table public.affiliate_commissions (
  order_id text primary key references public.checkout_orders(id),
  affiliate_id uuid not null references public.affiliates(id),
  amount integer not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','paid','void')),
  ready_at timestamptz not null, payout_id uuid references public.affiliate_payouts(id),
  created_at timestamptz not null default now()
);
create index affiliate_commission_balance on public.affiliate_commissions(affiliate_id, status, ready_at);
create index affiliate_payout_account on public.affiliate_payouts(affiliate_id, status);
create table public.affiliate_debits (
  order_id text primary key references public.checkout_orders(id),
  affiliate_id uuid not null references public.affiliates(id), amount integer not null check (amount > 0),
  created_at timestamptz not null default now()
);

create function public.affiliate_issue_otp(p_email text, p_name text, p_hash text, p_ip_hash text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('affiliate-ip:' || p_ip_hash, 0));
  perform pg_advisory_xact_lock(hashtextextended('affiliate-email:' || p_email, 0));
  if exists(select 1 from affiliate_auth_requests where email = p_email and created_at > now() - interval '60 seconds')
     or (select count(*) from affiliate_auth_requests where email = p_email and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from affiliate_auth_requests where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'RATE_LIMIT';
  end if;
  delete from affiliate_auth_requests where created_at < now() - interval '1 day';
  delete from affiliate_sessions where expires_at < now();
  delete from affiliate_otps where expires_at < now();
  insert into affiliate_auth_requests(email, ip_hash) values (p_email, p_ip_hash);
  insert into affiliate_otps(email, name, code_hash, expires_at)
    values(p_email, p_name, p_hash, now() + interval '10 minutes')
    on conflict(email) do update set name=excluded.name, code_hash=excluded.code_hash,
      expires_at=excluded.expires_at, attempts=0, created_at=now();
end;
$$;

create function public.affiliate_verify_otp(p_email text, p_hash text, p_session_hash text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_otp affiliate_otps; v_id uuid;
begin
  select * into v_otp from affiliate_otps where email=p_email for update;
  if not found or v_otp.expires_at <= now() or v_otp.attempts >= 5 then return null; end if;
  if v_otp.code_hash <> p_hash then
    update affiliate_otps set attempts=attempts+1 where email=p_email;
    return null;
  end if;
  insert into affiliates(email, name) values(p_email, v_otp.name)
    on conflict(email) do update set email=excluded.email returning id into v_id;
  insert into affiliate_sessions(token_hash, affiliate_id, expires_at)
    values(p_session_hash, v_id, now() + interval '30 days');
  delete from affiliate_otps where email=p_email;
  return v_id;
end;
$$;

-- Locks the account first in all financial functions, preventing payout/refund races.
create function public.affiliate_record_payment(p_order_id text, p_amount integer, p_state text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_order checkout_orders; v_comm affiliate_commissions; v_payout affiliate_payouts;
begin
  select * into v_order from checkout_orders where id=p_order_id;
  if not found then return null; end if;
  if v_order.affiliate_id is not null then perform 1 from affiliates where id=v_order.affiliate_id for update; end if;
  select * into v_order from checkout_orders where id=p_order_id for update;
  if v_order.amount <> p_amount then raise exception 'AMOUNT_MISMATCH'; end if;
  if p_state = 'paid' and v_order.status <> 'reversed' then
    update checkout_orders set status='paid', paid_at=coalesce(paid_at,now()) where id=p_order_id;
    if v_order.affiliate_id is not null
       and exists(select 1 from affiliates where id=v_order.affiliate_id and status='active' and email<>v_order.email) then
      insert into affiliate_commissions(order_id, affiliate_id, amount, ready_at)
        values(p_order_id, v_order.affiliate_id, floor(v_order.amount::numeric * v_order.commission_percent / 100)::integer,
          now() + interval '14 days') on conflict(order_id) do nothing;
    end if;
  elsif p_state = 'reversed' then
    update checkout_orders set status='reversed' where id=p_order_id;
    select * into v_comm from affiliate_commissions where order_id=p_order_id for update;
    if found and v_comm.status <> 'void' then
      if v_comm.payout_id is not null then
        select * into v_payout from affiliate_payouts where id=v_comm.payout_id for update;
        if v_payout.status = 'pending' then
          update affiliate_payouts set status='rejected', admin_note='Dibatalkan karena transaksi refund/chargeback', resolved_at=now()
            where id=v_payout.id;
          update affiliate_commissions set payout_id=null where payout_id=v_payout.id and status='pending';
        elsif v_payout.status = 'paid' then
          insert into affiliate_debits(order_id,affiliate_id,amount) values(p_order_id,v_comm.affiliate_id,v_comm.amount)
            on conflict(order_id) do nothing;
        end if;
      end if;
      update affiliate_commissions set status='void' where order_id=p_order_id;
    end if;
  elsif p_state not in ('unpaid','paid') then raise exception 'INVALID_STATE';
  end if;
  select * into v_order from checkout_orders where id=p_order_id;
  return to_jsonb(v_order);
end;
$$;

create function public.affiliate_request_payout(p_affiliate_id uuid, p_bank text, p_number text, p_name text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_gross integer; v_debit integer; v_net integer; v_id uuid;
begin
  perform 1 from affiliates where id=p_affiliate_id and status='active' for update;
  if not found then raise exception 'ACCOUNT_BLOCKED'; end if;
  if length(p_bank) not between 2 and 80 or p_number !~ '^[0-9]{6,30}$' or length(p_name) not between 2 and 80 then
    raise exception 'INVALID_BANK';
  end if;
  select coalesce(sum(amount),0) into v_gross from affiliate_commissions
    where affiliate_id=p_affiliate_id and status='pending' and payout_id is null and ready_at<=now();
  select greatest(0,coalesce((select sum(amount) from affiliate_debits where affiliate_id=p_affiliate_id),0)
    - coalesce((select sum(debit_amount) from affiliate_payouts where affiliate_id=p_affiliate_id and status<>'rejected'),0)) into v_debit;
  v_net := v_gross - v_debit;
  if v_net < 100000 then raise exception 'MINIMUM_PAYOUT'; end if;
  insert into affiliate_payouts(affiliate_id,amount,debit_amount,bank,account_number,account_name)
    values(p_affiliate_id,v_net,v_debit,p_bank,p_number,p_name) returning id into v_id;
  update affiliate_commissions set payout_id=v_id
    where affiliate_id=p_affiliate_id and status='pending' and payout_id is null and ready_at<=now();
  return v_id;
end;
$$;

create function public.affiliate_resolve_payout(p_id uuid, p_action text, p_reference text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_payout affiliate_payouts;
begin
  select * into v_payout from affiliate_payouts where id=p_id;
  if not found then raise exception 'PAYOUT_NOT_FOUND'; end if;
  perform 1 from affiliates where id=v_payout.affiliate_id for update;
  select * into v_payout from affiliate_payouts where id=p_id for update;
  if v_payout.status <> 'pending' then raise exception 'ALREADY_RESOLVED'; end if;
  if p_action not in ('paid','rejected') or length(p_reference) not between 2 and 160 then raise exception 'INVALID_ACTION'; end if;
  update affiliate_payouts set status=p_action, resolved_at=now(),
    transfer_reference=case when p_action='paid' then p_reference else null end,
    admin_note=case when p_action='rejected' then p_reference else null end where id=p_id;
  if p_action='paid' then
    update affiliate_commissions set status='paid' where payout_id=p_id and status='pending';
  else
    update affiliate_commissions set payout_id=null where payout_id=p_id and status='pending';
  end if;
end;
$$;

create function public.affiliate_dashboard(p_affiliate_id uuid)
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  with balance as (
    select coalesce(sum(amount) filter(where status='pending' and payout_id is null and ready_at<=now()),0) as gross,
      coalesce(sum(amount) filter(where status='pending' and payout_id is null and ready_at>now()),0) as hold,
      count(*) filter(where status<>'void') as sales
    from affiliate_commissions where affiliate_id=p_affiliate_id
  ), debt as (
    select greatest(0,coalesce((select sum(amount) from affiliate_debits where affiliate_id=p_affiliate_id),0)
      -coalesce((select sum(debit_amount) from affiliate_payouts where affiliate_id=p_affiliate_id and status<>'rejected'),0)) as amount
  )
  select jsonb_build_object(
    'account',(select jsonb_build_object('id',id,'email',email,'name',name,'code',code,'status',status) from affiliates where id=p_affiliate_id),
    'stats',jsonb_build_object('clicks',(select count(*) from affiliate_clicks where affiliate_id=p_affiliate_id),
      'sales',balance.sales,'hold',balance.hold,'available',greatest(0,balance.gross-debt.amount),'debt',greatest(0,debt.amount-balance.gross),
      'in_review',coalesce((select sum(amount) from affiliate_payouts where affiliate_id=p_affiliate_id and status='pending'),0),
      'paid',coalesce((select sum(amount) from affiliate_payouts where affiliate_id=p_affiliate_id and status='paid'),0)),
    'commissions',coalesce((select jsonb_agg(row_to_json(c)) from (
      select ac.order_id,ac.amount,ac.status,ac.ready_at,ac.created_at,ac.payout_id,co.plan
      from affiliate_commissions ac join checkout_orders co on co.id=ac.order_id
      where ac.affiliate_id=p_affiliate_id order by ac.created_at desc limit 100) c),'[]'::jsonb),
    'payouts',coalesce((select jsonb_agg(row_to_json(p)) from (
      select id,amount,status,bank,right(account_number,4) as account_last4,transfer_reference,admin_note,created_at
      from affiliate_payouts where affiliate_id=p_affiliate_id order by created_at desc limit 50) p),'[]'::jsonb)
  ) from balance,debt;
$$;

create function public.affiliate_prepare_license(p_order_id text, p_key text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_order checkout_orders; v_key text;
begin
  select * into v_order from checkout_orders where id=p_order_id for update;
  if not found or v_order.status<>'paid' then raise exception 'ORDER_NOT_PAID'; end if;
  perform pg_advisory_xact_lock(hashtextextended('license-email:' || v_order.email,0));
  select key into v_key from licenses where email=v_order.email and status='active' order by created_at desc limit 1;
  if v_key is null then
    v_key := p_key;
    insert into licenses(key,email,stripe_customer_id,stripe_subscription_id,status,plan)
      values(v_key,v_order.email,v_order.id,v_order.id,'active',v_order.plan);
  else
    update licenses set plan=v_order.plan where key=v_key;
  end if;
  return jsonb_build_object('key',v_key,'delivered',v_order.license_delivered,'email',v_order.email);
end;
$$;

create function public.affiliate_admin_dashboard()
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'accounts',coalesce((select jsonb_agg(row_to_json(a)) from (
      select id,name,email,code,status,created_at from affiliates order by created_at desc limit 200) a),'[]'::jsonb),
    'payouts',coalesce((select jsonb_agg(row_to_json(p)) from (
      select ap.*,a.name,a.email from affiliate_payouts ap join affiliates a on a.id=ap.affiliate_id
      order by (ap.status='pending') desc,ap.created_at desc limit 200) p),'[]'::jsonb),
    'stats',jsonb_build_object('accounts',(select count(*) from affiliates),
      'sales',(select count(*) from affiliate_commissions where status<>'void'),
      'pending_payouts',coalesce((select sum(amount) from affiliate_payouts where status='pending'),0),
      'paid_payouts',coalesce((select sum(amount) from affiliate_payouts where status='paid'),0))
  );
$$;

do $$
declare t text; f regprocedure;
begin
  foreach t in array array['affiliates','affiliate_otps','affiliate_auth_requests','affiliate_sessions','affiliate_clicks',
    'checkout_orders','affiliate_payouts','affiliate_commissions','affiliate_debits'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant all on public.%I to service_role',t);
  end loop;
  grant usage,select on sequence affiliate_auth_requests_id_seq to service_role;
  for f in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace
    and proname in ('affiliate_issue_otp','affiliate_verify_otp','affiliate_record_payment','affiliate_request_payout',
      'affiliate_resolve_payout','affiliate_dashboard','affiliate_admin_dashboard','affiliate_prepare_license') loop
    execute format('revoke all on function %s from public, anon, authenticated',f);
    execute format('grant execute on function %s to service_role',f);
  end loop;
end;
$$;
commit;
