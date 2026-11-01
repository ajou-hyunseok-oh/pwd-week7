import { validateAdminKey } from '../src/middleware/admin.middleware';
import { ADMIN_KEY } from './helpers/fixtures';

afterEach(() => { jest.restoreAllMocks(); });

test('관리자 키와 Supabase 키를 구분하고 예제 값의 사용을 막는다', () => {
  jest.replaceProperty(process, 'env', { ...process.env, ADMIN_API_KEY: ADMIN_KEY });
  expect(validateAdminKey()).toBe(ADMIN_KEY);
  process.env.ADMIN_API_KEY = 'short';
  expect(validateAdminKey).toThrow('ADMIN_API_KEY');
  process.env.ADMIN_API_KEY = 'replace_with_a_random_key_from_npm_run_key_generate';
  expect(validateAdminKey).toThrow('ADMIN_API_KEY');
  process.env.ADMIN_API_KEY = 'sb_secret_do_not_reuse_this_key_in_http_requests';
  expect(validateAdminKey).toThrow('다른 값');
});

test.each([
  { SUPABASE_URL: undefined, SUPABASE_SECRET_KEY: undefined },
  { SUPABASE_URL: 'https://your-project-ref.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_replace_me' },
  { SUPABASE_URL: 'https://example.supabase.co/rest/v1', SUPABASE_SECRET_KEY: 'sb_secret_test' },
  { SUPABASE_URL: 'http://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test' },
  { SUPABASE_URL: 'ftp://localhost', SUPABASE_SECRET_KEY: 'sb_secret_test' },
  { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_publishable_wrong_type' },
])('잘못된 Supabase 설정은 네트워크 요청 전에 거절한다: %j', (values) => {
  jest.replaceProperty(process, 'env', { ...process.env, ...values });
  jest.isolateModules(() => {
    const { getSupabase } = require('../src/config/supabase') as typeof import('../src/config/supabase');
    expect(getSupabase).toThrow();
  });
});
