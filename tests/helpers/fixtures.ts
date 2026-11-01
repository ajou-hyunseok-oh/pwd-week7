import type { RestaurantRow, SubmissionRow } from '../../src/types/database.types';

export const ADMIN_KEY = 'test-only-admin-token-12345678901234567890';

export function restaurantRow(overrides: Partial<RestaurantRow> = {}): RestaurantRow {
  return {
    id: 1, name: '송림식당', category: '한식', location: '아주대 정문',
    price_range: '7,000-13,000원', rating: 4.5, description: '맛집',
    recommended_menu: ['순두부'], likes: 0, image: '', submission_id: null,
    created_at: '2026-11-01T00:00:00+00:00', updated_at: '2026-11-01T00:00:00+00:00',
    ...overrides,
  };
}

export function submissionRow(overrides: Partial<SubmissionRow> = {}): SubmissionRow {
  return {
    id: 1, restaurant_name: '제보 식당', category: '분식', location: '캠퍼스',
    price_range: '5,000원', recommended_menu: ['김밥'], review: '맛있음',
    submitter_name: '실습생', submitter_email: 'student@example.com', status: 'pending',
    created_at: '2026-11-01T00:00:00+00:00', updated_at: '2026-11-01T00:00:00+00:00',
    ...overrides,
  };
}
