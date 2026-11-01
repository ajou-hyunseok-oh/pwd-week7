import type { SubmissionRow } from '../types/database.types';
import type { SubmissionData, SubmissionStatus } from '../types/submission.types';

export default class Submission implements SubmissionData {
  id: number;
  restaurantName: string;
  category: string;
  location: string;
  priceRange: string;
  recommendedMenu: string[];
  review: string;
  submitterName: string;
  submitterEmail: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;

  constructor(row: SubmissionRow) {
    this.id = row.id;
    this.restaurantName = row.restaurant_name;
    this.category = row.category;
    this.location = row.location;
    this.priceRange = row.price_range;
    this.recommendedMenu = [...row.recommended_menu];
    this.review = row.review;
    this.submitterName = row.submitter_name;
    this.submitterEmail = row.submitter_email;
    this.status = row.status;
    this.createdAt = row.created_at;
    this.updatedAt = row.updated_at;
  }
}
