import { Router } from 'express';
import * as controller from '../controllers/restaurants.controller';
import { requireAdmin } from '../middleware/admin.middleware';

const router = Router();
router.get('/', controller.getRestaurants);
router.get('/popular', controller.getPopularRestaurants);
router.get('/:id', controller.getRestaurant);
router.post('/', requireAdmin, controller.createRestaurant);
router.put('/:id', requireAdmin, controller.updateRestaurant);
router.delete('/:id', requireAdmin, controller.deleteRestaurant);
export default router;
