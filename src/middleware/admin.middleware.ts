import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import HttpError from '../utils/httpError';

export function validateAdminKey(): string {
  const key = process.env.ADMIN_API_KEY?.trim();
  if (!key || key.length < 32 || key.includes('replace_')) {
    throw new Error('ADMIN_API_KEY를 설정하세요. npm run key:generate로 32자 이상의 별도 키를 만들 수 있습니다.');
  }
  if (key === process.env.SUPABASE_SECRET_KEY || key.startsWith('sb_secret_')) {
    throw new Error('ADMIN_API_KEY는 Supabase Secret key와 다른 값이어야 합니다.');
  }
  return key;
}

export const requireAdmin: RequestHandler = (req, res, next) => {
  let expected: string;
  try { expected = validateAdminKey(); } catch {
    next(new HttpError(503, '서버 관리자 키가 설정되지 않았습니다.'));
    return;
  }
  const header = req.get('authorization');
  const supplied = header?.startsWith('Bearer ') ? header.slice(7) : '';
  const actualBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) {
    next(new HttpError(401, '관리자 Bearer 토큰이 필요합니다.'));
    return;
  }
  next();
};
