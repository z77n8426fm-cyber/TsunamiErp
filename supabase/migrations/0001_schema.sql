-- ============================================================================
-- TSUNAMI ERP — Migración 0001: Esquema principal
-- Sistema ERP para TSUNAMI IMPORT, SRL
-- Base de datos normalizada y escalable (PostgreSQL / Supabase)
-- ============================================================================

-- Extensiones necesarias
create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- ============================================================================
-- TIPOS ENUMERADOS
-- ============================================================================

create type user_role as enum ('admin', 'gerente', 'ventas', 'almacen', 'contabilidad');

create type movement_type as enum ('entrada', 'salida', 'ajuste', 'transferencia');

create type sale_doc_type as enum ('cotizacion', 'pedido', 'factura');

create type sale_status as enum ('pendiente', 'confirmado', 'despachado', 'entregado', 'cancelado');

create type import_status as enum ('borrador', 'confirmada', 'en_transito', 'en_aduana', 'recibida', 'cancelada');

create type payment_method as enum ('efectivo', 'transferencia', 'cheque', 'tarjeta', 'credito');

-- ============================================================================
-- PERFILES DE USUARIO (extiende auth.users de Supabase)
-- ============================================================================

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  email       text not null unique,
  phone       text,
  role        user_role not null default 'ventas',
  avatar_url  text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Perfil y rol de cada usuario del sistema (Módulo 8).';

-- ============================================================================
-- CONFIGURACIÓN DE LA EMPRESA (Módulo 9) — fila única
-- ============================================================================

create table public.company_settings (
  id                   int primary key default 1 check (id = 1),
  name                 text not null default 'TSUNAMI IMPORT, SRL',
  rnc                  text,
  logo_url             text,
  address              text,
  city                 text,
  province             text,
  country              text not null default 'República Dominicana',
  phone                text,
  whatsapp             text,
  email                text,
  currency             text not null default 'DOP',
  currency_symbol      text not null default 'RD$',
  tax_name             text not null default 'ITBIS',
  tax_rate             numeric(5,2) not null default 18.00,
  quote_validity_days  int not null default 15,
  low_stock_threshold  int not null default 10,
  notifications        jsonb not null default '{"low_stock": true, "new_sale": true, "import_arrival": true}'::jsonb,
  updated_at           timestamptz not null default now()
);

-- ============================================================================
-- CATÁLOGOS BASE
-- ============================================================================

create table public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Categorías con auto-referencia: las subcategorías apuntan a su categoría padre
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  parent_id   uuid references public.categories (id) on delete cascade,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (name, parent_id)
);

create index idx_categories_parent on public.categories (parent_id);

create table public.suppliers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  country       text,
  contact_name  text,
  email         text,
  phone         text,
  whatsapp      text,
  wechat        text,
  address       text,
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.warehouses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  code        text not null unique,
  address     text,
  is_default  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- PRODUCTOS (Módulo 2)
-- ============================================================================

create table public.products (
  id                 uuid primary key default gen_random_uuid(),
  sku                text not null unique,
  barcode            text unique,
  name               text not null,
  description        text,
  brand_id           uuid references public.brands (id) on delete set null,
  category_id        uuid references public.categories (id) on delete set null,
  subcategory_id     uuid references public.categories (id) on delete set null,
  color              text,
  size               text,
  material           text,
  country_of_origin  text,
  supplier_id        uuid references public.suppliers (id) on delete set null,
  -- Costos (el costo total se calcula automáticamente)
  fob_cost           numeric(12,2) not null default 0,
  import_expenses    numeric(12,2) not null default 0,
  total_cost         numeric(12,2) generated always as (fob_cost + import_expenses) stored,
  -- Precios
  suggested_price    numeric(12,2) not null default 0,
  wholesale_price    numeric(12,2) not null default 0,
  retail_price       numeric(12,2) not null default 0,
  -- Inventario
  min_stock          int not null default 10,
  -- Multimedia
  video_url          text,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index idx_products_brand on public.products (brand_id);
create index idx_products_category on public.products (category_id);
create index idx_products_supplier on public.products (supplier_id);
create index idx_products_name_trgm on public.products using gin (to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(sku, '')));

create table public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  url         text not null,
  is_primary  boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index idx_product_images_product on public.product_images (product_id);

-- ============================================================================
-- CLIENTES (Módulo 4)
-- ============================================================================

create table public.customers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  company       text,
  rnc           text,
  address       text,
  city          text,
  province      text,
  country       text not null default 'República Dominicana',
  phone         text,
  whatsapp      text,
  email         text,
  instagram     text,
  credit_limit  numeric(12,2) not null default 0,
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_customers_name on public.customers using gin (to_tsvector('spanish', coalesce(name, '') || ' ' || coalesce(company, '')));

-- Precio especial por cliente y producto
create table public.customer_special_prices (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  price       numeric(12,2) not null,
  created_at  timestamptz not null default now(),
  unique (customer_id, product_id)
);

-- ============================================================================
-- INVENTARIO (Módulo 2): existencias por almacén + historial de movimientos
-- ============================================================================

create table public.inventory_stock (
  product_id    uuid not null references public.products (id) on delete cascade,
  warehouse_id  uuid not null references public.warehouses (id) on delete cascade,
  quantity      int not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (product_id, warehouse_id)
);

create table public.inventory_movements (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products (id) on delete cascade,
  warehouse_id     uuid not null references public.warehouses (id),
  to_warehouse_id  uuid references public.warehouses (id),  -- solo para transferencias
  type             movement_type not null,
  quantity         int not null check (quantity > 0),
  unit_cost        numeric(12,2),
  reference        text,   -- ej. número de factura o PO relacionado
  notes            text,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  constraint transfer_requires_destination
    check (type <> 'transferencia' or to_warehouse_id is not null)
);

create index idx_movements_product on public.inventory_movements (product_id, created_at desc);
create index idx_movements_created on public.inventory_movements (created_at desc);

-- ============================================================================
-- VENTAS (Módulo 5): cotizaciones, pedidos y facturas en una sola tabla
-- ============================================================================

create table public.document_counters (
  doc_type   sale_doc_type primary key,
  last_value bigint not null default 0
);

insert into public.document_counters (doc_type) values ('cotizacion'), ('pedido'), ('factura');

create table public.sales (
  id                uuid primary key default gen_random_uuid(),
  number            text not null unique,          -- COT-000001 / PED-000001 / FAC-000001
  doc_type          sale_doc_type not null default 'cotizacion',
  status            sale_status not null default 'pendiente',
  customer_id       uuid not null references public.customers (id),
  warehouse_id      uuid references public.warehouses (id),
  subtotal          numeric(12,2) not null default 0,
  discount_percent  numeric(5,2) not null default 0,
  discount_amount   numeric(12,2) not null default 0,
  tax_amount        numeric(12,2) not null default 0,
  total             numeric(12,2) not null default 0,
  paid_amount       numeric(12,2) not null default 0,
  valid_until       date,                          -- vigencia de la cotización
  notes             text,
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_sales_customer on public.sales (customer_id);
create index idx_sales_created on public.sales (created_at desc);
create index idx_sales_type_status on public.sales (doc_type, status);

create table public.sale_items (
  id          uuid primary key default gen_random_uuid(),
  sale_id     uuid not null references public.sales (id) on delete cascade,
  product_id  uuid not null references public.products (id),
  description text,
  quantity    int not null check (quantity > 0),
  unit_price  numeric(12,2) not null,
  discount    numeric(12,2) not null default 0,
  total       numeric(12,2) generated always as ((quantity * unit_price) - discount) stored
);

create index idx_sale_items_sale on public.sale_items (sale_id);
create index idx_sale_items_product on public.sale_items (product_id);

-- Recibos de pago
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null references public.sales (id) on delete cascade,
  customer_id  uuid not null references public.customers (id),
  amount       numeric(12,2) not null check (amount > 0),
  method       payment_method not null default 'efectivo',
  reference    text,
  notes        text,
  received_by  uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);

create index idx_payments_sale on public.payments (sale_id);
create index idx_payments_customer on public.payments (customer_id);

-- ============================================================================
-- IMPORTACIONES (Módulo 6): órdenes de compra desde China e India
-- ============================================================================

create table public.imports (
  id                  uuid primary key default gen_random_uuid(),
  po_number           text not null unique,
  supplier_id         uuid not null references public.suppliers (id),
  status              import_status not null default 'borrador',
  commercial_invoice  text,
  packing_list        text,
  bl_number           text,
  container_number    text,
  etd                 date,
  eta                 date,
  port                text,
  shipping_line       text,
  fob_cost            numeric(14,2) not null default 0,
  freight_cost        numeric(14,2) not null default 0,
  insurance_cost      numeric(14,2) not null default 0,
  customs_cost        numeric(14,2) not null default 0,
  other_costs         numeric(14,2) not null default 0,
  total_cost          numeric(14,2) generated always as
                      (fob_cost + freight_cost + insurance_cost + customs_cost + other_costs) stored,
  currency            text not null default 'USD',
  notes               text,
  created_by          uuid references public.profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index idx_imports_supplier on public.imports (supplier_id);
create index idx_imports_status on public.imports (status);

create table public.import_items (
  id             uuid primary key default gen_random_uuid(),
  import_id      uuid not null references public.imports (id) on delete cascade,
  product_id     uuid not null references public.products (id),
  quantity       int not null check (quantity > 0),
  unit_fob_cost  numeric(12,2) not null default 0,
  total          numeric(14,2) generated always as (quantity * unit_fob_cost) stored
);

create index idx_import_items_import on public.import_items (import_id);

create table public.import_documents (
  id          uuid primary key default gen_random_uuid(),
  import_id   uuid not null references public.imports (id) on delete cascade,
  name        text not null,
  doc_type    text,   -- factura_comercial, packing_list, bl, otro
  url         text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- NOTIFICACIONES
-- ============================================================================

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete cascade,
  type        text not null,
  title       text not null,
  message     text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index idx_notifications_user on public.notifications (user_id, is_read, created_at desc);
