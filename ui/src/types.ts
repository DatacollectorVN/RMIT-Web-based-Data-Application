export type Product = {
  product_id: string;
  product_title: string;
  brand_name: string;
  product_url?: string | null;
  price: number | null;
  avg_rating: number | null;
  review_count?: number;
  product_tags?: string | null;
  description?: string | null;
  image_local: string | null;
  img_placeholder: string | null;
  brand_bg: string | null;
  brand_txt: string | null;
  brand_emoji: string | null;
};

export type UserRole = "buyer" | "customer" | "admin";

export type AuthUser = {
  username: string;
  role: UserRole;
  token?: string;
};

export type ReviewInput = {
  title: string;
  body: string;
  rating: number;
  predicted_label?: string;
  override_label?: string;
};

export type ProductInput = {
  product_title: string;
  brand_name: string;
  price: number;
  product_tags?: string;
  image_local?: string;
};

export type CheckoutInput = {
  full_name: string;
  email: string;
  address: string;
  payment_method: string;
};

export type Review = {
  review_id: string;
  product_id: string;
  user_id: string | null;
  review_title: string | null;
  review_text: string;
  review_rating: number;
  is_a_buyer: number;
  model_predicted: number | null;
  user_overridden: number;
  author: string;
  source: string;
  created_at?: string;
};
