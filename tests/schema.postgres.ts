import { PGlite } from '@electric-sql/pglite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test, before, beforeEach, after, afterEach } from 'node:test';
import { generateSeedSql } from '../scripts/generate-seed';

// PostgreSQL을 로컬 임시 폴더에서 실행합니다. Supabase 자격증명이 필요 없습니다.
const schema = readFileSync(path.join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8');
const seed = readFileSync(path.join(__dirname, '..', 'supabase', 'seed.sql'), 'utf8');
let db: PGlite;
let directory: string;

before(async () => {
  directory = mkdtempSync(path.join(tmpdir(), 'pwd-week7-postgres-'));
  db = new PGlite(directory);
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(schema);
});
beforeEach(async () => {
  await db.exec('reset role; truncate public.restaurants, public.submissions restart identity cascade;');
});
afterEach(async () => {
  await db.exec('reset role; drop function if exists public.reject_approval_for_test() cascade;');
});
after(async () => {
  await db?.close();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

async function addSubmission(status = 'pending'): Promise<number> {
  const result = await db.query<{ id: number }>(
    'insert into public.submissions(restaurant_name,category,location,status) values ($1,$2,$3,$4) returning id',
    ['제보 식당', '한식', '아주대', status],
  );
  return result.rows[0].id;
}

test('체크인한 초기 SQL이 원본 JSON에서 재생성되는 내용과 같다', () => {
  assert.equal(seed, generateSeedSql());
});

test('초기 SQL은 세 맛집을 넣고 재실행해도 중복 또는 덮어쓰기가 없다', async () => {
  await db.exec(seed);
  const first = await db.query<{ id: number; name: string }>('select id,name from public.restaurants order by id');
  assert.deepEqual(first.rows.map((row) => row.name), ['송림식당', '별미떡볶이', 'SOGO']);
  await db.exec(seed);
  assert.deepEqual((await db.query('select id,name from public.restaurants order by id')).rows, first.rows);
  const next = await db.query<{ id: number }>("insert into public.restaurants(name,category,location) values ('새 식당','한식','아주대') returning id");
  assert.equal(next.rows[0].id, 4);
});

test('자동 ID, 기본값, 배열과 DB 제약조건이 동작한다', async () => {
  const created = await db.query<{ id: number; price_range: string; recommended_menu: string[]; rating: number; likes: number }>(
    "insert into public.restaurants(name,category,location) values ('식당','한식','캠퍼스') returning *",
  );
  const row = created.rows[0];
  assert.equal(row.id, 1);
  assert.equal(row.price_range, '정보 없음');
  assert.deepEqual(row.recommended_menu, []);
  assert.equal(row.rating, 0);
  assert.equal(row.likes, 0);
  await assert.rejects(db.query("insert into public.restaurants(name,category,location,rating) values ('식당','한식','캠퍼스',6)"), { code: '23514' });
  await assert.rejects(db.query("insert into public.restaurants(name,category,location) values (' ','한식','캠퍼스')"), { code: '23514' });
  await assert.rejects(db.query("insert into public.submissions(restaurant_name,category,location,status) values ('식당','한식','캠퍼스','invalid')"), { code: '23514' });
});

test('RLS가 활성화되고 공개 역할은 개인정보/테이블/승인 함수에 접근하지 못한다', async () => {
  const rls = await db.query<{ relrowsecurity: boolean }>("select relrowsecurity from pg_class where oid in ('public.restaurants'::regclass, 'public.submissions'::regclass)");
  assert.equal(rls.rows.length, 2);
  assert.ok(rls.rows.every((row) => row.relrowsecurity));
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select * from public.submissions'), { code: '42501' });
    await assert.rejects(db.query('select public.approve_submission(1)'), { code: '42501' });
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  await db.query("insert into public.restaurants(name,category,location) values ('서버 등록','한식','캠퍼스')");
  assert.equal((await db.query('select * from public.restaurants')).rows.length, 1);
});

test('승인은 맛집 생성과 상태 변경을 함께 처리하고 재승인 시 중복 생성하지 않는다', async () => {
  const id = await addSubmission();
  await db.exec('set role service_role');
  const approved = await db.query<{ item: { status: string } }>('select public.approve_submission($1) as item', [id]);
  assert.equal(approved.rows[0].item.status, 'approved');
  await db.query('select public.approve_submission($1)', [id]);
  assert.deepEqual((await db.query<{ submission_id: number }>('select submission_id from public.restaurants')).rows, [{ submission_id: id }]);
});

test('승인 상태 UPDATE가 실패하면 앞선 맛집 INSERT도 롤백한다', async () => {
  const id = await addSubmission();
  await db.exec(`
    create function public.reject_approval_for_test() returns trigger language plpgsql as $$
    begin raise exception 'simulated status update failure'; end; $$;
    create trigger reject_approval_for_test before update on public.submissions
    for each row execute function public.reject_approval_for_test();
  `);
  await assert.rejects(db.query('select public.approve_submission($1)', [id]), /simulated status update failure/);
  assert.equal((await db.query('select * from public.restaurants')).rows.length, 0);
  assert.equal((await db.query<{ status: string }>('select status from public.submissions where id=$1', [id])).rows[0].status, 'pending');
});

test('없는 제보와 반려된 제보는 승인할 수 없다', async () => {
  await assert.rejects(db.query('select public.approve_submission(999)'), { code: 'P0002' });
  const id = await addSubmission('rejected');
  await assert.rejects(db.query('select public.approve_submission($1)', [id]), { code: 'P0001' });
  assert.equal((await db.query('select * from public.restaurants')).rows.length, 0);
});

test('제보 삭제 시 이미 생성한 맛집을 보존하고 외래 키만 해제한다', async () => {
  const id = await addSubmission();
  await db.query('select public.approve_submission($1)', [id]);
  await db.query('delete from public.submissions where id=$1', [id]);
  assert.deepEqual((await db.query('select submission_id from public.restaurants')).rows, [{ submission_id: null }]);
});

test('updated_at 트리거는 수정 시각을 DB에서 갱신한다', async () => {
  const id = await addSubmission();
  await db.query("update public.submissions set review='변경', updated_at='2000-01-01' where id=$1", [id]);
  const result = await db.query<{ updated_at: Date }>('select updated_at from public.submissions where id=$1', [id]);
  assert.ok(new Date(result.rows[0].updated_at).getTime() > Date.parse('2000-01-02'));
});

test('DB 엔진을 닫고 다시 열어도 등록 데이터가 유지된다', async () => {
  await db.query("insert into public.restaurants(name,category,location) values ('영구 저장 확인','한식','캠퍼스')");
  await db.close();
  db = new PGlite(directory);
  assert.deepEqual((await db.query('select name from public.restaurants')).rows, [{ name: '영구 저장 확인' }]);
});
