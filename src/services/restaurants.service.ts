import { getSupabase, throwDatabaseError } from '../config/supabase';
import Restaurant from '../models/restaurant.model';
import type { RestaurantInsert } from '../types/database.types';
import { inputObject, menu, nonemptyPatch, positiveInteger, rating, text } from '../utils/validation';

function restaurantFields(payload: unknown, creating: boolean): Partial<RestaurantInsert> {
  const body = inputObject(payload);
  const fields: Partial<RestaurantInsert> = {};
  for (const field of ['name', 'category', 'location'] as const) {
    if (creating || Object.hasOwn(body, field)) fields[field] = text(body[field], field, true);
  }
  for (const [apiField, column] of [
    ['priceRange', 'price_range'], ['description', 'description'], ['image', 'image'],
  ] as const) {
    if (Object.hasOwn(body, apiField)) fields[column] = text(body[apiField], apiField);
  }
  if (Object.hasOwn(body, 'rating')) fields.rating = rating(body.rating);
  if (Object.hasOwn(body, 'recommendedMenu')) fields.recommended_menu = menu(body.recommendedMenu);
  return fields;
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await getSupabase().from('restaurants').select('*').order('id');
  if (error) throwDatabaseError(error);
  return (data ?? []).map((row) => new Restaurant(row));
}

export async function getRestaurantById(id: unknown): Promise<Restaurant | null> {
  const numericId = positiveInteger(id);
  const { data, error } = await getSupabase().from('restaurants').select('*').eq('id', numericId).maybeSingle();
  if (error) throwDatabaseError(error);
  return data ? new Restaurant(data) : null;
}

export async function getPopularRestaurants(limit: unknown = 5): Promise<Restaurant[]> {
  const count = positiveInteger(limit, 'limit', 100);
  const { data, error } = await getSupabase().from('restaurants').select('*')
    .order('rating', { ascending: false }).order('id').limit(count);
  if (error) throwDatabaseError(error);
  return (data ?? []).map((row) => new Restaurant(row));
}

export async function createRestaurant(payload: unknown): Promise<Restaurant> {
  // required 세 필드는 restaurantFields의 creating 분기에서 검증합니다.
  const fields = restaurantFields(payload, true) as RestaurantInsert;
  const { data, error } = await getSupabase().from('restaurants').insert(fields).select('*').single();
  if (error) throwDatabaseError(error);
  return new Restaurant(data!);
}

export async function updateRestaurant(id: unknown, payload: unknown): Promise<Restaurant | null> {
  const numericId = positiveInteger(id);
  const fields = restaurantFields(payload, false);
  nonemptyPatch(fields);
  const { data, error } = await getSupabase().from('restaurants').update(fields).eq('id', numericId).select('*').maybeSingle();
  if (error) throwDatabaseError(error);
  return data ? new Restaurant(data) : null;
}

export async function deleteRestaurant(id: unknown): Promise<Restaurant | null> {
  const numericId = positiveInteger(id);
  const { data, error } = await getSupabase().from('restaurants').delete().eq('id', numericId).select('*').maybeSingle();
  if (error) throwDatabaseError(error);
  return data ? new Restaurant(data) : null;
}
