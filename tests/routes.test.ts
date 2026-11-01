import request from 'supertest';
import createApp from '../src/app';
import * as restaurants from '../src/services/restaurants.service';
import * as submissions from '../src/services/submissions.service';
import * as config from '../src/config/supabase';
import Restaurant from '../src/models/restaurant.model';
import Submission from '../src/models/submission.model';
import HttpError from '../src/utils/httpError';
import { ADMIN_KEY, restaurantRow, submissionRow } from './helpers/fixtures';

jest.mock('../src/services/restaurants.service');
jest.mock('../src/services/submissions.service');
jest.mock('../src/config/supabase');

const restaurantService = jest.mocked(restaurants);
const submissionService = jest.mocked(submissions);
const database = jest.mocked(config);

beforeEach(() => {
  jest.replaceProperty(process, 'env', { ...process.env, ADMIN_API_KEY: ADMIN_KEY, CORS_ORIGINS: 'http://localhost:5173' });
  restaurantService.getAllRestaurants.mockResolvedValue([new Restaurant(restaurantRow())]);
  restaurantService.getRestaurantById.mockResolvedValue(new Restaurant(restaurantRow()));
  restaurantService.getPopularRestaurants.mockResolvedValue([new Restaurant(restaurantRow())]);
  restaurantService.createRestaurant.mockResolvedValue(new Restaurant(restaurantRow({ id: 4 })));
  restaurantService.updateRestaurant.mockResolvedValue(new Restaurant(restaurantRow({ rating: 4.8 })));
  restaurantService.deleteRestaurant.mockResolvedValue(new Restaurant(restaurantRow()));
  submissionService.createSubmission.mockResolvedValue(new Submission(submissionRow()));
  submissionService.listSubmissions.mockResolvedValue([new Submission(submissionRow())]);
  submissionService.updateSubmission.mockResolvedValue(new Submission(submissionRow({ status: 'approved' })));
  database.checkDatabase.mockResolvedValue(undefined);
});
afterEach(() => { jest.clearAllMocks(); jest.restoreAllMocks(); });

test('health는 DB 없이 응답하고 DB 진단은 관리자 요청의 조회 결과를 사용한다', async () => {
  const app = createApp();
  expect((await request(app).get('/health')).body).toEqual({ status: 'ok' });
  expect(database.checkDatabase).not.toHaveBeenCalled();
  await request(app).get('/health/db').expect(401);
  const response = await request(app).get('/health/db').auth(ADMIN_KEY, { type: 'bearer' }).expect(200);
  expect(response.body).toEqual({ status: 'ok', db: 'supabase' });
  database.checkDatabase.mockRejectedValueOnce(new HttpError(503, 'DB unavailable'));
  await request(app).get('/health/db').auth(ADMIN_KEY, { type: 'bearer' }).expect(503);
});

test('조회 경로와 /popular 우선순위를 유지한다', async () => {
  const app = createApp();
  await request(app).get('/api/restaurants').expect(200);
  await request(app).get('/api/restaurants/popular?limit=2').expect(200);
  expect(restaurantService.getPopularRestaurants).toHaveBeenCalledWith('2');
  expect(restaurantService.getRestaurantById).not.toHaveBeenCalled();
  await request(app).get('/api/restaurants/1').expect(200);
  restaurantService.getRestaurantById.mockResolvedValueOnce(null);
  await request(app).get('/api/restaurants/999').expect(404);
});

test('관리자 키 없이 맛집 등록/수정/삭제를 실행하지 않는다', async () => {
  const app = createApp();
  await request(app).post('/api/restaurants').send({ name: '임의 등록' }).expect(401);
  await request(app).put('/api/restaurants/1').send({ rating: 5 }).expect(401);
  await request(app).delete('/api/restaurants/1').expect(401);
  expect(restaurantService.createRestaurant).not.toHaveBeenCalled();
  expect(restaurantService.updateRestaurant).not.toHaveBeenCalled();
  expect(restaurantService.deleteRestaurant).not.toHaveBeenCalled();
});

test('관리자 맛집 CRUD는 201/200/204를 반환한다', async () => {
  const app = createApp();
  const created = await request(app).post('/api/restaurants').auth(ADMIN_KEY, { type: 'bearer' }).send({ name: '식당' }).expect(201);
  expect(created.body.data.id).toBe(4);
  await request(app).put('/api/restaurants/1').auth(ADMIN_KEY, { type: 'bearer' }).send({ rating: 4.8 }).expect(200);
  const deleted = await request(app).delete('/api/restaurants/1').auth(ADMIN_KEY, { type: 'bearer' }).expect(204);
  expect(deleted.text).toBe('');
  restaurantService.updateRestaurant.mockResolvedValueOnce(null);
  await request(app).put('/api/restaurants/999').auth(ADMIN_KEY, { type: 'bearer' }).send({ rating: 4.8 }).expect(404);
});

test('제보 생성은 공개하되 개인정보 조회/관리는 관리자로 제한한다', async () => {
  const app = createApp();
  await request(app).post('/api/submissions').send({ restaurantName: '제보 식당' }).expect(201);
  await request(app).get('/api/submissions').expect(401);
  await request(app).get('/api/submissions/1').expect(401);
  await request(app).put('/api/submissions/1').send({ status: 'approved' }).expect(401);
  await request(app).delete('/api/submissions/1').expect(401);
  await request(app).get('/api/submissions?status=pending').auth(ADMIN_KEY, { type: 'bearer' }).expect(200);
  expect(submissionService.listSubmissions).toHaveBeenCalledWith('pending');
  await request(app).put('/api/submissions/1').auth(ADMIN_KEY, { type: 'bearer' }).send({ status: 'approved' }).expect(200);
});

test('잘못된 JSON 본문은 400으로 처리한다', async () => {
  await request(createApp()).post('/api/submissions').type('json').send('{broken').expect(400);
});

test('관리자 키 미설정 시 관리 경로를 개방하지 않는다', async () => {
  delete process.env.ADMIN_API_KEY;
  await request(createApp()).post('/api/restaurants').send({}).expect(503);
});

test('production 오류 응답에 스택이나 내부 오류를 노출하지 않는다', async () => {
  process.env.NODE_ENV = 'production';
  restaurantService.getAllRestaurants.mockRejectedValueOnce(new Error('internal diagnostic detail'));
  const response = await request(createApp()).get('/api/restaurants').expect(500);
  expect(response.body).toEqual({ error: { message: 'Internal Server Error' } });
});

test('CORS는 지정한 클라이언트 출처에만 허용 헤더를 보낸다', async () => {
  const app = createApp();
  const allowed = await request(app).get('/health').set('Origin', 'http://localhost:5173');
  const other = await request(app).get('/health').set('Origin', 'https://other.example');
  expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  expect(other.headers['access-control-allow-origin']).toBeUndefined();
});

test('알 수 없는 경로는 표준 404 응답을 반환한다', async () => {
  const response = await request(createApp()).get('/unknown').expect(404);
  expect(response.body).toEqual({ error: { message: 'Resource not found' } });
});
