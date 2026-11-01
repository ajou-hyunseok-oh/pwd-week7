export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface SubmissionData {
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
}

export interface CreateSubmissionInput {
  restaurantName: string;
  category: string;
  location: string;
  priceRange?: string;
  recommendedMenu?: string[];
  review?: string;
  submitterName?: string;
  submitterEmail?: string;
}

export type UpdateSubmissionInput = Partial<CreateSubmissionInput> & { status?: SubmissionStatus };
