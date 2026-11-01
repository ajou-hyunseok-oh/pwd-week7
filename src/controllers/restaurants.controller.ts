import * as service from '../services/restaurants.service';
import asyncHandler from '../utils/asyncHandler';
import HttpError from '../utils/httpError';

// 6주차와 동일하게 컨트롤러는 HTTP 상태/응답, 서비스는 DB 처리와 검증을 담당합니다.
export const getRestaurants = asyncHandler(async (req, res) => {
  res.json({ data: await service.getAllRestaurants() });
});
export const getPopularRestaurants = asyncHandler(async (req, res) => {
  res.json({ data: await service.getPopularRestaurants(req.query.limit ?? 5) });
});
export const getRestaurant = asyncHandler(async (req, res) => {
  const item = await service.getRestaurantById(req.params.id);
  if (!item) throw new HttpError(404, 'Restaurant not found');
  res.json({ data: item });
});
export const createRestaurant = asyncHandler(async (req, res) => {
  res.status(201).json({ data: await service.createRestaurant(req.body) });
});
export const updateRestaurant = asyncHandler(async (req, res) => {
  const item = await service.updateRestaurant(req.params.id, req.body);
  if (!item) throw new HttpError(404, 'Restaurant not found');
  res.json({ data: item });
});
export const deleteRestaurant = asyncHandler(async (req, res) => {
  const item = await service.deleteRestaurant(req.params.id);
  if (!item) throw new HttpError(404, 'Restaurant not found');
  res.status(204).send();
});
