import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import HttpError from '../utils/httpError';

let client: SupabaseClient<Database> | undefined;

export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key || url.includes('your-project-ref') || key.includes('replace_')) {
    throw new Error('서버 루트 .env의 SUPABASE_URL과 SUPABASE_SECRET_KEY를 실제 값으로 설정하세요.');
  }
  let parsed: URL;
  try { parsed = new URL(url); } catch {
    throw new Error('SUPABASE_URL은 https://프로젝트식별자.supabase.co 형식이어야 합니다.');
  }
  const local = ['localhost', '127.0.0.1'].includes(parsed.hostname);
  const validProtocol = parsed.protocol === 'https:' || (local && parsed.protocol === 'http:');
  if (!validProtocol || !['/', ''].includes(parsed.pathname) || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error('SUPABASE_URL에는 HTTPS 기본 URL만 입력하세요. /rest/v1 경로를 붙이지 않습니다.');
  }
  if (!key.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_SECRET_KEY에는 Settings > API Keys의 sb_secret_ 키를 입력하세요.');
  }
  client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

export function throwDatabaseError(error: { code?: string; message: string }): never {
  console.error('[Supabase]', error.code ?? 'network', error.message);
  if (error.code === 'P0002') throw new HttpError(404, 'Submission not found');
  if (error.code === 'P0001' || error.code === '23505') throw new HttpError(409, '현재 상태에서는 이 요청을 처리할 수 없습니다.');
  if (['23502', '23514', '22P02', '22003'].includes(error.code ?? '')) {
    throw new HttpError(400, '입력값이 데이터베이스 제약조건에 맞지 않습니다.');
  }
  throw new HttpError(503, '데이터베이스 요청에 실패했습니다. 서버 로그를 확인하세요.');
}

export async function checkDatabase(db = getSupabase()): Promise<void> {
  // 열 이름까지 확인해 잘못된 프로젝트나 예전 테이블 구조도 발견합니다.
  const results = await Promise.all([
    db.from('restaurants').select('id,name,category,location,price_range,rating,description,recommended_menu,likes,image,submission_id,created_at,updated_at').limit(1),
    db.from('submissions').select('id,restaurant_name,category,location,price_range,recommended_menu,review,submitter_name,submitter_email,status,created_at,updated_at').limit(1),
  ]);
  for (const result of results) if (result.error) throwDatabaseError(result.error);
}
