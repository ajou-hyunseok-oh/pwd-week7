import type { RestaurantRow } from '../types/database.types';
import type { RestaurantData } from '../types/restaurant.types';

// 6주차의 Restaurant 모델을 DB 행 → 기존 API 응답 변환에 사용합니다.
export default class Restaurant implements RestaurantData {
  id: number;
  name: string;
  category: string;
  location: string;
  priceRange: string;
  rating: number;
  description: string;
  recommendedMenu: string[];
  likes: number;
  image: string;
  submissionId: number | null;
  createdAt: string;
  updatedAt: string;

  constructor(row: RestaurantRow) {
    this.id = row.id;
    this.name = row.name;
    this.category = row.category;
    this.location = row.location;
    this.priceRange = row.price_range;
    this.rating = row.rating;
    this.description = row.description;
    this.recommendedMenu = [...row.recommended_menu];
    this.likes = row.likes;
    this.image = row.image;
    this.submissionId = row.submission_id;
    this.createdAt = row.created_at;
    this.updatedAt = row.updated_at;
  }
}
