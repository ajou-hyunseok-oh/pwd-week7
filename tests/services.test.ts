import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/database.types';
import * as config from '../src/config/supabase';
import * as restaurants from '../src/services/restaurants.service';
import * as submissions from '../src/services/submissions.service';
import { restaurantRow, submissionRow } from './helpers/fixtures';

// 실제 SDK가 만드는 HTTP 요청을 검사하되 fetch를 대체해 외부 DB에는 접근하지 않습니다.
type CapturedRequest = { url: URL; method: string; headers: Headers; body: Record<string, unknown> | null };
let requests: CapturedRequest[];
let replies: { data: unknown; status: number }[];

function reply(data: unknown, status = 200): void { replies.push({ data, status }); }

beforeEach(() => {
  requests = [];
  replies = [];
  const client = createClient<Database>('https://example.invalid', 'sb_secret_offline_test', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (input, init) => {
      const request = new Request(input, init);
      requests.push({ url: new URL(request.url), method: request.method, headers: request.headers,
        body: ['POST', 'PATCH'].includes(request.method) ? await request.json() as Record<string, unknown> : null });
      const response = replies.shift();
      if (!response) throw new Error('Unexpected SDK request: no offline response prepared');
      return new Response(JSON.stringify(response.data), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    } },
  });
  jest.spyOn(config, 'getSupabase').mockReturnValue(client);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => { jest.restoreAllMocks(); });

test('DB 행을 기존 camelCase 응답으로 변환한다', async () => {
  reply([restaurantRow()]);
  const result = await restaurants.getAllRestaurants();
  expect(result[0]).toMatchObject({ id: 1, priceRange: '7,000-13,000원', recommendedMenu: ['순두부'], submissionId: null });
  expect(result[0]).not.toHaveProperty('price_range');
  expect(requests[0].url.searchParams.get('order')).toBe('id.asc');
});

test('상세 조회는 id로 필터링하고 없는 행은 null로 처리한다', async () => {
  reply([restaurantRow()]);
  expect((await restaurants.getRestaurantById('1'))?.id).toBe(1);
  expect(requests[0].url.searchParams.get('id')).toBe('eq.1');
  reply([]);
  expect(await restaurants.getRestaurantById(999)).toBeNull();
});

test('인기 목록의 정렬과 제한을 DB에 전달한다', async () => {
  reply([restaurantRow()]);
  await restaurants.getPopularRestaurants('2');
  expect(requests[0].url.searchParams.get('order')).toBe('rating.desc,id.asc');
  expect(requests[0].url.searchParams.get('limit')).toBe('2');
});

test('등록 ID는 DB 반환값을 사용하고 임의 id/likes를 저장하지 않는다', async () => {
  reply(restaurantRow({ id: 42 }), 201);
  const result = await restaurants.createRestaurant({ id: 999, name: ' 새 식당 ', category: '분식', location: '정문',
    rating: '4.2', recommendedMenu: '김밥, 라면,', likes: 1000, submissionId: 8 });
  expect(result.id).toBe(42);
  expect(requests[0].body).toEqual({ name: '새 식당', category: '분식', location: '정문', rating: 4.2, recommended_menu: ['김밥', '라면'] });
  expect(requests[0].headers.get('prefer')).toContain('return=representation');
});

test('부분 수정에서 생략한 메뉴를 빈 배열로 덮어쓰지 않는다', async () => {
  reply(restaurantRow({ rating: 4.8 }));
  await restaurants.updateRestaurant(1, { rating: 4.8 });
  expect(requests[0].method).toBe('PATCH');
  expect(requests[0].body).toEqual({ rating: 4.8 });
});

test('삭제에는 id 필터를 붙이고 없는 행은 null을 반환한다', async () => {
  reply([restaurantRow()]);
  expect((await restaurants.deleteRestaurant(1))?.id).toBe(1);
  expect(requests[0].method).toBe('DELETE');
  expect(requests[0].url.searchParams.get('id')).toBe('eq.1');
  reply([]);
  expect(await restaurants.deleteRestaurant(999)).toBeNull();
});

test.each(['abc', '1.5', '1e2', 0, -1, 2147483648, ['1']])('잘못된 id %j는 DB 요청 전에 거절한다', async (id) => {
  await expect(restaurants.getRestaurantById(id)).rejects.toMatchObject({ statusCode: 400 });
  expect(requests).toHaveLength(0);
});

test.each(['x', 0, -1, 101, 1.5, ['2']])('잘못된 limit %j를 거절한다', async (limit) => {
  await expect(restaurants.getPopularRestaurants(limit)).rejects.toMatchObject({ statusCode: 400 });
});

test.each([undefined, null, [], { name: '식당' }, { name: ' ', category: '한식', location: '캠퍼스' },
  { name: '식당', category: '한식', location: '캠퍼스', rating: true },
  { name: '식당', category: '한식', location: '캠퍼스', rating: '' },
  { name: '식당', category: '한식', location: '캠퍼스', rating: 9 },
  { name: '식당', category: '한식', location: '캠퍼스', recommendedMenu: {} },
])('잘못된 등록 본문 %j를 거절한다', async (body) => {
  await expect(restaurants.createRestaurant(body)).rejects.toMatchObject({ statusCode: 400 });
  expect(requests).toHaveLength(0);
});

test('수정할 필드가 없는 요청을 거절한다', async () => {
  await expect(restaurants.updateRestaurant(1, { id: 77 })).rejects.toMatchObject({ statusCode: 400 });
});

test('DB 권한 오류를 성공이나 빈 목록으로 숨기지 않는다', async () => {
  reply({ code: '42501', message: 'permission denied', details: null, hint: null }, 403);
  await expect(restaurants.getAllRestaurants()).rejects.toMatchObject({ statusCode: 503 });
});

test('제보 등록은 외부 status/id를 무시하고 pending 기본값을 사용한다', async () => {
  reply(submissionRow(), 201);
  const result = await submissions.createSubmission({ id: 88, status: 'approved', restaurantName: '제보 식당', category: '분식', location: '캠퍼스', recommendedMenu: ['김밥', 1] });
  expect(result.status).toBe('pending');
  expect(requests[0].body).toEqual({ restaurant_name: '제보 식당', category: '분식', location: '캠퍼스', recommended_menu: ['김밥'] });
});

test('제보 목록 상태 필터를 DB로 전달한다', async () => {
  reply([submissionRow()]);
  await submissions.listSubmissions('pending');
  expect(requests[0].url.searchParams.get('status')).toBe('eq.pending');
  await expect(submissions.listSubmissions('other')).rejects.toMatchObject({ statusCode: 400 });
});

test('승인은 원자적 DB 함수에 한 번 요청한다', async () => {
  reply(submissionRow({ status: 'approved' }));
  const result = await submissions.updateSubmission(1, { status: 'approved' });
  expect(result?.status).toBe('approved');
  expect(requests).toHaveLength(1);
  expect(requests[0].url.pathname).toBe('/rest/v1/rpc/approve_submission');
  expect(requests[0].body).toEqual({ p_submission_id: 1 });
});

test('내용 수정과 승인을 섞은 요청은 변경 전에 거절한다', async () => {
  await expect(submissions.updateSubmission(1, { status: 'approved', restaurantName: '변경' })).rejects.toMatchObject({ statusCode: 400 });
  expect(requests).toHaveLength(0);
});

test('승인된 제보 수정은 상태 조건으로 막는다', async () => {
  reply([]);
  reply([submissionRow({ status: 'approved' })]);
  await expect(submissions.updateSubmission(1, { review: '변경' })).rejects.toMatchObject({ statusCode: 409 });
  expect(requests[0].url.searchParams.get('status')).toBe('neq.approved');
});

test('DB 연결 확인은 두 테이블의 실제 열을 조회한다', async () => {
  reply([]); reply([]);
  await config.checkDatabase(config.getSupabase());
  expect(requests.map((request) => request.url.pathname)).toEqual(['/rest/v1/restaurants', '/rest/v1/submissions']);
});
