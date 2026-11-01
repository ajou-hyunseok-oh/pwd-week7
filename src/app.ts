import express, { type Express } from 'express';
import cors from 'cors';
import restaurantsRouter from './routes/restaurants.routes';
import submissionsRouter from './routes/submissions.routes';
import { checkDatabase } from './config/supabase';
import { requireAdmin } from './middleware/admin.middleware';
import notFound from './middleware/notFound.middleware';
import errorHandler from './middleware/error.middleware';
import asyncHandler from './utils/asyncHandler';

export default function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  const origins = (process.env.CORS_ORIGINS ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  app.use(cors({ origin: origins }));
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  app.get('/health', (req, res) => { res.json({ status: 'ok' }); });
  // 실제 DB 요청을 발생시키는 진단 경로는 관리자로 제한합니다.
  app.get('/health/db', requireAdmin, asyncHandler(async (req, res) => {
    await checkDatabase();
    res.json({ status: 'ok', db: 'supabase' });
  }));
  app.use('/api/restaurants', restaurantsRouter);
  app.use('/api/submissions', submissionsRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
