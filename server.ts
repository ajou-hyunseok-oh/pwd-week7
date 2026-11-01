import 'dotenv/config';
import createApp from './src/app';
import { checkDatabase } from './src/config/supabase';
import { validateAdminKey } from './src/middleware/admin.middleware';

const app = createApp();

export async function start(): Promise<void> {
  try {
    validateAdminKey();
    const port = Number(process.env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT는 1~65535 사이의 정수여야 합니다.');
    const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1');
    await checkDatabase();
    console.log('[Supabase] restaurants / submissions 연결 확인 성공');
    const server = app.listen(port, host, () => console.log(`Server listening at http://${host}:${port}`));
    server.on('error', (error) => { console.error('서버 시작 실패:', error.message); process.exitCode = 1; });
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, () => { server.close(() => { process.exitCode = 0; }); });
    }
  } catch (error) {
    console.error('서버 시작 실패:', error instanceof Error ? error.message : '알 수 없는 오류');
    process.exitCode = 1;
  }
}

if (require.main === module) void start();
export default app;
