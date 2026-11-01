import HttpError from './httpError';

export type InputObject = Record<string, unknown>;

export function inputObject(value: unknown): InputObject {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, '본문은 JSON 객체여야 합니다.');
  }
  return value as InputObject;
}

export function text(value: unknown, field: string, required = false): string {
  if (typeof value !== 'string' || (required && !value.trim())) {
    throw new HttpError(400, required ? `'${field}' is required` : `'${field}' must be a string`);
  }
  return value.trim();
}

export function menu(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  throw new HttpError(400, 'recommendedMenu는 문자열 또는 문자열 배열이어야 합니다.');
}

export function rating(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) {
    throw new HttpError(400, 'rating은 0~5 사이의 숫자여야 합니다.');
  }
  const result = Number(value);
  if (!Number.isFinite(result) || result < 0 || result > 5) throw new HttpError(400, 'rating은 0~5 사이의 숫자여야 합니다.');
  return result;
}

export function positiveInteger(value: unknown, field = 'id', maximum = 2147483647): number {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+$/.test(String(value))) {
    throw new HttpError(400, `${field}는 1~${maximum} 사이의 정수여야 합니다.`);
  }
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 1 || result > maximum) throw new HttpError(400, `${field}는 1~${maximum} 사이의 정수여야 합니다.`);
  return result;
}

export function nonemptyPatch(value: object): void {
  if (!Object.keys(value).length) throw new HttpError(400, '수정할 필드를 하나 이상 입력하세요.');
}
