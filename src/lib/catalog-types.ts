export type Category = "iphone" | "macbook" | "ipad" | "watch" | "acessorios";

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  installment_12x: number;
  installment_label: string;
  description: string;
  specs: Record<string, string>;
  images: string[];
  is_available: boolean;
  cta_url: string;
  cta_url_luisa: string;
  cta_label: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  tagline: string;
  instagram_handle: string;
  instagram_url: string;
  address: string;
  city_state: string;
  legal_name: string;
  repair_quote_url: string;
  whatsapp_url: string;
  updated_at: string;
}

export interface Depoimento {
  id: string;
  image_path: string;
  alt_text: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
