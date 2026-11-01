import { getSupabase, throwDatabaseError } from '../config/supabase';
import Submission from '../models/submission.model';
import type { Database, SubmissionInsert } from '../types/database.types';
import type { SubmissionStatus } from '../types/submission.types';
import HttpError from '../utils/httpError';
import { inputObject, menu, nonemptyPatch, positiveInteger, text } from '../utils/validation';

const statuses: SubmissionStatus[] = ['pending', 'approved', 'rejected'];
type SubmissionPatch = Database['public']['Tables']['submissions']['Update'];

function statusValue(value: unknown): SubmissionStatus {
  if (typeof value !== 'string' || !statuses.includes(value as SubmissionStatus)) {
    throw new HttpError(400, 'status는 pending, approved, rejected 중 하나여야 합니다.');
  }
  return value as SubmissionStatus;
}

function submissionFields(payload: unknown, creating: boolean): SubmissionPatch {
  const body = inputObject(payload);
  const fields: SubmissionPatch = {};
  for (const [apiField, column] of [
    ['restaurantName', 'restaurant_name'], ['category', 'category'], ['location', 'location'],
  ] as const) {
    if (creating || Object.hasOwn(body, apiField)) fields[column] = text(body[apiField], apiField, true);
  }
  for (const [apiField, column] of [
    ['priceRange', 'price_range'], ['review', 'review'], ['submitterName', 'submitter_name'], ['submitterEmail', 'submitter_email'],
  ] as const) {
    if (Object.hasOwn(body, apiField)) fields[column] = text(body[apiField], apiField);
  }
  if (fields.submitter_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.submitter_email)) {
    throw new HttpError(400, 'submitterEmail 형식을 확인하세요.');
  }
  if (Object.hasOwn(body, 'recommendedMenu')) fields.recommended_menu = menu(body.recommendedMenu);
  if (!creating && Object.hasOwn(body, 'status')) fields.status = statusValue(body.status);
  return fields;
}

export async function listSubmissions(status?: unknown): Promise<Submission[]> {
  const filter = status === undefined ? undefined : statusValue(status);
  let query = getSupabase().from('submissions').select('*');
  if (filter) query = query.eq('status', filter);
  const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false });
  if (error) throwDatabaseError(error);
  return (data ?? []).map((row) => new Submission(row));
}

export async function getSubmissionById(id: unknown): Promise<Submission | null> {
  const numericId = positiveInteger(id);
  const { data, error } = await getSupabase().from('submissions').select('*').eq('id', numericId).maybeSingle();
  if (error) throwDatabaseError(error);
  return data ? new Submission(data) : null;
}

export async function createSubmission(payload: unknown): Promise<Submission> {
  // status/id는 요청 본문에서 받지 않으며 DB의 pending/자동 ID 기본값을 사용합니다.
  const fields = submissionFields(payload, true) as SubmissionInsert;
  const { data, error } = await getSupabase().from('submissions').insert(fields).select('*').single();
  if (error) throwDatabaseError(error);
  return new Submission(data!);
}

export async function updateSubmission(id: unknown, payload: unknown): Promise<Submission | null> {
  const numericId = positiveInteger(id);
  const fields = submissionFields(payload, false);
  nonemptyPatch(fields);
  if (fields.status === 'approved') {
    if (Object.keys(fields).length !== 1) {
      throw new HttpError(400, '내용 수정과 승인은 분리하세요. 승인 요청에는 status만 전달합니다.');
    }
    // 맛집 생성과 상태 변경은 하나의 PostgreSQL 트랜잭션입니다.
    const { data, error } = await getSupabase().rpc('approve_submission', { p_submission_id: numericId });
    if (error) throwDatabaseError(error);
    return data ? new Submission(data) : null;
  }
  const { data, error } = await getSupabase().from('submissions').update(fields)
    .eq('id', numericId).neq('status', 'approved').select('*').maybeSingle();
  if (error) throwDatabaseError(error);
  if (data) return new Submission(data);
  const existing = await getSubmissionById(numericId);
  if (existing) throw new HttpError(409, '승인된 제보의 내용과 상태는 변경할 수 없습니다. 맛집 API에서 수정하세요.');
  return null;
}

export async function deleteSubmission(id: unknown): Promise<Submission | null> {
  const numericId = positiveInteger(id);
  const { data, error } = await getSupabase().from('submissions').delete().eq('id', numericId).select('*').maybeSingle();
  if (error) throwDatabaseError(error);
  return data ? new Submission(data) : null;
}
