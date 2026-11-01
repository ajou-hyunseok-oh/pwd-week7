export interface RestaurantData {
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
}

export interface CreateRestaurantInput {
  name: string;
  category: string;
  location: string;
  priceRange?: string;
  rating?: number;
  description?: string;
  recommendedMenu?: string[];
  image?: string;
}

export type UpdateRestaurantInput = Partial<CreateRestaurantInput>;
