// Supabase 테이블의 snake_case 열과 RPC 반환값을 나타내는 타입입니다.
// schema.sql을 변경하면 이 파일과 모델의 응답 변환도 함께 갱신합니다.
export type RestaurantRow = {
  id: number;
  name: string;
  category: string;
  location: string;
  price_range: string;
  rating: number;
  description: string;
  recommended_menu: string[];
  likes: number;
  image: string;
  submission_id: number | null;
  created_at: string;
  updated_at: string;
};

export type SubmissionRow = {
  id: number;
  restaurant_name: string;
  category: string;
  location: string;
  price_range: string;
  recommended_menu: string[];
  review: string;
  submitter_name: string;
  submitter_email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
};

export type RestaurantInsert = Pick<RestaurantRow, 'name' | 'category' | 'location'> &
  Partial<Pick<RestaurantRow, 'price_range' | 'rating' | 'description' | 'recommended_menu' | 'image'>>;
export type SubmissionInsert = Pick<SubmissionRow, 'restaurant_name' | 'category' | 'location'> &
  Partial<Pick<SubmissionRow, 'price_range' | 'recommended_menu' | 'review' | 'submitter_name' | 'submitter_email'>>;

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: RestaurantRow;
        Insert: RestaurantInsert;
        Update: Partial<RestaurantInsert>;
        Relationships: [];
      };
      submissions: {
        Row: SubmissionRow;
        Insert: SubmissionInsert;
        Update: Partial<SubmissionInsert> & { status?: SubmissionRow['status'] };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      // SQL의 jsonb 반환값은 to_jsonb(submissions 행)으로 고정됩니다.
      approve_submission: { Args: { p_submission_id: number }; Returns: SubmissionRow };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
