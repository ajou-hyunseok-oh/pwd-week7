-- Supabase SQL Editor에서 새 실습 프로젝트에 한 번 실행합니다.
-- 생성된 PostgreSQL DB 안에 테이블, 제약조건, 권한, 승인 함수를 추가합니다.
begin;

create table public.submissions (
  id integer generated always as identity primary key,
  restaurant_name text not null check (length(btrim(restaurant_name)) > 0),
  category text not null check (length(btrim(category)) > 0),
  location text not null check (length(btrim(location)) > 0),
  price_range text not null default '',
  recommended_menu text[] not null default '{}',
  review text not null default '',
  submitter_name text not null default '',
  submitter_email text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurants (
  id integer generated always as identity primary key,
  name text not null check (length(btrim(name)) > 0),
  category text not null check (length(btrim(category)) > 0),
  location text not null check (length(btrim(location)) > 0),
  price_range text not null default '정보 없음',
  rating double precision not null default 0 check (rating between 0 and 5),
  description text not null default '',
  recommended_menu text[] not null default '{}',
  likes integer not null default 0 check (likes >= 0),
  image text not null default '',
  submission_id integer unique references public.submissions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index restaurants_rating_idx on public.restaurants (rating desc, id);
create index submissions_status_created_idx on public.submissions (status, created_at desc);

create function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create trigger restaurants_updated_at before update on public.restaurants
for each row execute function public.set_updated_at();
create trigger submissions_updated_at before update on public.submissions
for each row execute function public.set_updated_at();

-- FOR UPDATE로 같은 제보의 동시 승인 요청을 직렬화합니다.
-- 맛집 INSERT와 상태 UPDATE 중 하나라도 실패하면 둘 다 롤백됩니다.
create function public.approve_submission(p_submission_id integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  item public.submissions%rowtype;
begin
  select * into item from public.submissions
  where id = p_submission_id for update;
  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;
  if item.status = 'approved' then
    return to_jsonb(item);
  end if;
  if item.status <> 'pending' then
    raise exception 'Only pending submissions can be approved' using errcode = 'P0001';
  end if;

  insert into public.restaurants
    (name, category, location, price_range, recommended_menu, description, submission_id)
  values
    (item.restaurant_name, item.category, item.location, item.price_range,
     item.recommended_menu, item.review, item.id);

  update public.submissions set status = 'approved'
  where id = item.id returning * into item;
  return to_jsonb(item);
end;
$$;

alter table public.restaurants enable row level security;
alter table public.submissions enable row level security;

-- React는 Express를 거치므로 anon/authenticated에 직접 테이블 권한을 주지 않습니다.
revoke all on table public.restaurants, public.submissions from anon, authenticated;
revoke all on sequence public.restaurants_id_seq, public.submissions_id_seq from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.restaurants, public.submissions to service_role;
grant usage, select on sequence public.restaurants_id_seq, public.submissions_id_seq to service_role;

-- 함수에 기본으로 부여되는 PostgreSQL PUBLIC 실행 권한도 명시적으로 회수합니다.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.approve_submission(integer) from public, anon, authenticated;
grant execute on function public.approve_submission(integer) to service_role;

commit;
