import 'dotenv/config';
import { checkDatabase } from '../src/config/supabase';

checkDatabase()
  .then(() => console.log('[Supabase] restaurants / submissions 연결 확인 성공'))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'DB 연결 확인 실패');
    process.exitCode = 1;
  });
