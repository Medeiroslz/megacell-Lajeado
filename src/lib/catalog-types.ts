export type Category = "iphone" | "macbook" | "ipad" | "watch" | "acessorios" | "xiaomi";

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  installment_12x: number;
  installment_18x: number;
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

export interface PreorderSettings {
  id: string;
  is_active: boolean;
  button_label: string;
  title: string;
  subtitle: string;
  rules: string;
  image_path: string;
  deposit_info: string;
  gifts: string[];
  gift_images: Record<string, string>;
  agree_label: string;
  cta_label: string;
  whatsapp_url: string;
  created_at: string;
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
