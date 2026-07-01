/**
 * Tipos de dominio de TSUNAMI ERP.
 * Reflejan el esquema de PostgreSQL definido en supabase/migrations.
 */

export type UserRole = "admin" | "gerente" | "ventas" | "almacen" | "contabilidad";

export type MovementType = "entrada" | "salida" | "ajuste" | "transferencia";

export type SaleDocType = "cotizacion" | "pedido" | "factura";

export type SaleStatus = "pendiente" | "confirmado" | "despachado" | "entregado" | "cancelado";

export type ImportStatus = "borrador" | "confirmada" | "en_transito" | "en_aduana" | "recibida" | "cancelada";

export type PaymentMethod = "efectivo" | "transferencia" | "cheque" | "tarjeta" | "credito";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanySettings {
  id: number;
  name: string;
  rnc: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  currency: string;
  currency_symbol: string;
  tax_name: string;
  tax_rate: number;
  quote_validity_days: number;
  low_stock_threshold: number;
  notifications: Record<string, boolean>;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  country: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  wechat: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string | null;
  is_default: boolean;
  is_active: boolean;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  brand_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  color: string | null;
  size: string | null;
  material: string | null;
  country_of_origin: string | null;
  supplier_id: string | null;
  fob_cost: number;
  import_expenses: number;
  total_cost: number;
  suggested_price: number;
  wholesale_price: number;
  retail_price: number;
  min_stock: number;
  video_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones opcionales (según el select)
  brand?: Brand | null;
  category?: Category | null;
  subcategory?: Category | null;
  supplier?: Supplier | null;
  images?: ProductImage[];
  stock?: { quantity: number; warehouse_id: string }[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Customer {
  id: string;
  name: string;
  company: string | null;
  rnc: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  country: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  credit_limit: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  warehouse_id: string;
  to_warehouse_id: string | null;
  type: MovementType;
  quantity: number;
  unit_cost: number | null;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  product?: Pick<Product, "id" | "sku" | "name"> | null;
  warehouse?: Pick<Warehouse, "id" | "name"> | null;
}

export interface Sale {
  id: string;
  number: string;
  doc_type: SaleDocType;
  status: SaleStatus;
  customer_id: string;
  warehouse_id: string | null;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  valid_until: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  customer?: Pick<Customer, "id" | "name" | "company" | "whatsapp" | "email"> | null;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  product?: Pick<Product, "id" | "sku" | "name"> | null;
}

export interface Payment {
  id: string;
  sale_id: string;
  customer_id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface ImportOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  status: ImportStatus;
  commercial_invoice: string | null;
  packing_list: string | null;
  bl_number: string | null;
  container_number: string | null;
  etd: string | null;
  eta: string | null;
  port: string | null;
  shipping_line: string | null;
  fob_cost: number;
  freight_cost: number;
  insurance_cost: number;
  customs_cost: number;
  other_costs: number;
  total_cost: number;
  currency: string;
  notes: string | null;
  created_at: string;
  supplier?: Pick<Supplier, "id" | "name" | "country"> | null;
  items?: ImportItem[];
}

export interface ImportItem {
  id: string;
  import_id: string;
  product_id: string;
  quantity: number;
  unit_fob_cost: number;
  total: number;
  product?: Pick<Product, "id" | "sku" | "name"> | null;
}

export interface DashboardStats {
  sales_today: number;
  sales_month: number;
  out_of_stock: number;
  low_stock: number;
  total_products: number;
  total_customers: number;
  inventory_value: number;
}

export interface ProductStock {
  product_id: string;
  sku: string;
  name: string;
  min_stock: number;
  total_cost: number;
  wholesale_price: number;
  total_quantity: number;
  stock_value: number;
}

export interface TopProduct {
  product_id: string;
  sku: string;
  name: string;
  units_sold: number;
  revenue: number;
}
