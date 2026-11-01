import type {
  ApiResponse, CreateRestaurantInput, CreateSubmissionInput, EntityId, Restaurant,
  Submission, SubmissionStatus, UpdateRestaurantInput, UpdateSubmissionInput,
} from '../types';

// Vite 환경 변수에는 공개해도 되는 서버 주소만 넣습니다.
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

// 개인 컴퓨터에서 하는 로컬 실습용입니다. 새로고침하면 메모리의 키가 사라집니다.
let adminKey: string | undefined;
let adminState: 'locked' | 'invalid' | 'unlocked' = 'locked';
const adminListeners = new Set<() => void>();

export function getAdminKey(): string | undefined { return adminKey; }
export function getAdminState(): 'locked' | 'invalid' | 'unlocked' { return adminState; }
export function subscribeAdminState(listener: () => void): () => void {
  adminListeners.add(listener);
  return () => { adminListeners.delete(listener); };
}
function notifyAdminState() { adminListeners.forEach((listener) => listener()); }
export function setAdminKey(value: string): void {
  const key = value.trim();
  if (!key) throw new Error('관리자 API 키를 입력하세요.');
  adminKey = key;
  adminState = 'unlocked';
  notifyAdminState();
}
export function clearAdminKey(invalid = false): void {
  adminKey = undefined;
  adminState = invalid ? 'invalid' : 'locked';
  notifyAdminState();
}

function requireAdminKey(): string {
  if (!adminKey) throw new Error('관리자 API 키를 입력하세요.');
  return adminKey;
}

async function request<T>(path: string, init: RequestInit = {}, admin = false): Promise<ApiResponse<T>> {
  if (!baseUrl) throw new Error('VITE_API_BASE_URL이 설정되지 않았습니다. .env.local을 확인하고 개발 서버를 다시 시작하세요.');
  const headers = new Headers(init.headers);
  const requestKey = admin ? requireAdminKey() : undefined;
  if (requestKey) headers.set('Authorization', `Bearer ${requestKey}`);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  if (!response.ok) {
    // 이전 요청이 늦게 실패하더라도 새로 입력한 키를 지우지 않습니다.
    if (requestKey && response.status === 401 && requestKey === getAdminKey()) clearAdminKey(true);
    const body: unknown = await response.json().catch(() => null);
    const message = typeof body === 'object' && body !== null && 'error' in body &&
      typeof body.error === 'object' && body.error !== null && 'message' in body.error &&
      typeof body.error.message === 'string' ? body.error.message : `요청 실패 (${response.status})`;
    throw new Error(message);
  }
  if (response.status === 204) return { data: undefined as T };
  return response.json() as Promise<ApiResponse<T>>;
}

const json = (method: string, payload: unknown): RequestInit => ({
  method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
});
const itemPath = (resource: string, id: EntityId) => `/api/${resource}/${encodeURIComponent(String(id))}`;

// 화면이 사용하던 { data: ... } 형식을 유지합니다.
export const restaurantAPI = {
  getRestaurants: () => request<Restaurant[]>('/api/restaurants'),
  getRestaurantById: (id: EntityId) => request<Restaurant>(itemPath('restaurants', id)),
  getPopularRestaurants: () => request<Restaurant[]>('/api/restaurants/popular'),
  createRestaurant: (payload: CreateRestaurantInput) => request<Restaurant>('/api/restaurants', json('POST', payload), true),
  updateRestaurant: (id: EntityId, payload: UpdateRestaurantInput) => request<Restaurant>(itemPath('restaurants', id), json('PUT', payload), true),
  deleteRestaurant: async (id: EntityId): Promise<number> => {
    await request<void>(itemPath('restaurants', id), { method: 'DELETE' }, true);
    return 204;
  },
};

export const submissionAPI = {
  createSubmission: (payload: CreateSubmissionInput) => request<Submission>('/api/submissions', json('POST', payload)),
  listSubmissions: (status?: SubmissionStatus) => request<Submission[]>(`/api/submissions${status ? `?status=${encodeURIComponent(status)}` : ''}`, {}, true),
  updateSubmission: (id: EntityId, payload: UpdateSubmissionInput) => request<Submission>(itemPath('submissions', id), json('PUT', payload), true),
  deleteSubmission: async (id: EntityId): Promise<number> => {
    await request<void>(itemPath('submissions', id), { method: 'DELETE' }, true);
    return 204;
  },
};

export default restaurantAPI;
