export type Availability = "available" | "low_stock" | "sold_out" | "on_order";
export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  neutral_name: string;
  short_description: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  category_id: string;
  category_ids: string[];
  availability_type: Availability;
  stock_quantity: number;
  lead_time_min_days: number | null;
  lead_time_max_days: number | null;
  featured: boolean;
  active: boolean;
  is_new: boolean;
  is_demo: boolean;
  tags: string[];
  highlights: string[];
  notice_text: string;
  notice_tone: "info" | "warning" | "offer";
  materials: string;
  dimensions: string;
  care: string;
  usage_note: string;
  return_note: string;
  images: string[];
  variants: Variant[];
  created_at: string;
};
export type Variant = {
  id: string;
  name: string;
  value: string;
  price_modifier: number;
  stock_quantity: number;
  active: boolean;
};
export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  active: boolean;
  sort_order: number;
};
export type Settings = {
  demo: boolean;
  age_gate: boolean;
  payments: {
    id: string;
    name: string;
    enabled: boolean;
    instructions: string;
  }[];
  delivery: { id: string; name: string; enabled: boolean; price: number }[];
  contact_email: string;
  legal_name: string;
  tax_id: string;
  business_address: string;
  whatsapp: string;
  instagram: string;
  shipping_text: string;
  privacy_text: string;
  terms_text: string;
  reservation_text: string;
  banner: string;
  hero_title: string;
  hero_description: string;
  hero_image: string;
  story_title: string;
  story_description: string;
  story_image: string;
  zones: string[];
};
export type Store = {
  products: Product[];
  categories: Category[];
  settings: Settings;
};
export type CartLine = {
  product_id: string;
  variant_id: string | null;
  quantity: number;
};
export const statuses = [
  "Solicitud recibida",
  "Pendiente de confirmación",
  "Confirmado",
  "Pedido al proveedor",
  "En tránsito",
  "Recibido en Paraguay",
  "En preparación",
  "En reparto",
  "Entregado",
  "Cancelado",
];
export const availabilityLabels: Record<Availability, string> = {
  available: "Disponible",
  low_stock: "Últimas unidades",
  sold_out: "Agotado",
  on_order: "Por pedido",
};
export const money = (n: number) =>
  "₲ " + Math.round(n).toLocaleString("es-PY");
export const lead = (
  p: Pick<Product, "lead_time_min_days" | "lead_time_max_days">,
) =>
  p.lead_time_min_days !== null && p.lead_time_max_days !== null
    ? `${p.lead_time_min_days}–${p.lead_time_max_days} días`
    : "Plazo a confirmar";
