import { Router } from 'express';
import * as controller from '../controllers/submissions.controller';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();
router.post('/', controller.create);
router.use(requireAdmin);
router.get('/', controller.list);
router.get('/:id', controller.get);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);
export default router;
