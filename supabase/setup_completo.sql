-- ============================================================================
-- TSUNAMI ERP — INSTALACIÓN COMPLETA EN UN SOLO ARCHIVO
--
-- Contiene las 4 migraciones en orden (esquema, funciones, seguridad y
-- datos iniciales) más una verificación final. Pegar COMPLETO en el
-- SQL Editor de Supabase y ejecutar UNA sola vez.
-- ============================================================================

-- Guardia: evita ejecutar dos veces por accidente
do $$ begin
  if exists (select 1 from pg_type where typname = 'user_role') then
    raise exception 'El ERP ya está instalado (total o parcialmente) en esta base de datos. No ejecutes este archivo de nuevo; consulta a Claude.';
  end if;
end $$;

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

-- ============================================================================
-- TSUNAMI ERP — Migración 0002: Funciones, triggers y vistas
-- ============================================================================

-- ----------------------------------------------------------------------------
-- updated_at automático
-- ----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_profiles_updated_at  before update on public.profiles  for each row execute function public.set_updated_at();
create trigger trg_products_updated_at  before update on public.products  for each row execute function public.set_updated_at();
create trigger trg_customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger trg_suppliers_updated_at before update on public.suppliers for each row execute function public.set_updated_at();
create trigger trg_sales_updated_at     before update on public.sales     for each row execute function public.set_updated_at();
create trigger trg_imports_updated_at   before update on public.imports   for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Crear perfil automáticamente al registrarse un usuario en Supabase Auth
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    -- El primer usuario registrado es administrador; los demás entran como ventas
    case when not exists (select 1 from public.profiles) then 'admin'::user_role else 'ventas'::user_role end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- Numeración automática de documentos de venta (COT-000001, PED-, FAC-)
-- ----------------------------------------------------------------------------

create or replace function public.next_document_number(p_type sale_doc_type)
returns text language plpgsql as $$
declare
  v_next bigint;
  v_prefix text;
begin
  update public.document_counters
     set last_value = last_value + 1
   where doc_type = p_type
   returning last_value into v_next;

  v_prefix := case p_type
    when 'cotizacion' then 'COT'
    when 'pedido'     then 'PED'
    when 'factura'    then 'FAC'
  end;

  return v_prefix || '-' || lpad(v_next::text, 6, '0');
end $$;

create or replace function public.assign_sale_number()
returns trigger language plpgsql as $$
begin
  if new.number is null or new.number = '' then
    new.number := public.next_document_number(new.doc_type);
  end if;
  return new;
end $$;

create trigger trg_sales_number before insert on public.sales
  for each row execute function public.assign_sale_number();

-- ----------------------------------------------------------------------------
-- Actualización automática de existencias al registrar un movimiento.
-- Entrada suma, salida resta, ajuste fija cantidad relativa, transferencia
-- mueve entre almacenes. Nunca permite existencias negativas.
-- ----------------------------------------------------------------------------

create or replace function public.apply_inventory_movement()
returns trigger language plpgsql as $$
declare
  v_current int;
begin
  -- Asegura la fila de existencias del almacén origen
  insert into public.inventory_stock (product_id, warehouse_id, quantity)
  values (new.product_id, new.warehouse_id, 0)
  on conflict (product_id, warehouse_id) do nothing;

  select quantity into v_current
    from public.inventory_stock
   where product_id = new.product_id and warehouse_id = new.warehouse_id
   for update;

  if new.type = 'entrada' then
    update public.inventory_stock
       set quantity = quantity + new.quantity, updated_at = now()
     where product_id = new.product_id and warehouse_id = new.warehouse_id;

  elsif new.type in ('salida', 'transferencia') then
    if v_current < new.quantity then
      raise exception 'Existencias insuficientes: disponible %, solicitado %', v_current, new.quantity;
    end if;
    update public.inventory_stock
       set quantity = quantity - new.quantity, updated_at = now()
     where product_id = new.product_id and warehouse_id = new.warehouse_id;

    if new.type = 'transferencia' then
      insert into public.inventory_stock (product_id, warehouse_id, quantity)
      values (new.product_id, new.to_warehouse_id, new.quantity)
      on conflict (product_id, warehouse_id)
        do update set quantity = inventory_stock.quantity + excluded.quantity, updated_at = now();
    end if;

  elsif new.type = 'ajuste' then
    -- El ajuste establece la cantidad exacta contada físicamente
    update public.inventory_stock
       set quantity = new.quantity, updated_at = now()
     where product_id = new.product_id and warehouse_id = new.warehouse_id;
  end if;

  return new;
end $$;

create trigger trg_apply_movement before insert on public.inventory_movements
  for each row execute function public.apply_inventory_movement();

-- ----------------------------------------------------------------------------
-- Al facturar (doc_type factura y estado confirmado o superior) se descuenta
-- el inventario mediante movimientos de salida.
-- ----------------------------------------------------------------------------

create or replace function public.deduct_stock_for_sale(p_sale_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_sale public.sales%rowtype;
  v_item record;
  v_warehouse uuid;
begin
  select * into v_sale from public.sales where id = p_sale_id;
  if not found then
    raise exception 'Venta % no encontrada', p_sale_id;
  end if;

  v_warehouse := coalesce(
    v_sale.warehouse_id,
    (select id from public.warehouses where is_default limit 1)
  );

  for v_item in select * from public.sale_items where sale_id = p_sale_id loop
    insert into public.inventory_movements
      (product_id, warehouse_id, type, quantity, reference, notes, created_by)
    values
      (v_item.product_id, v_warehouse, 'salida', v_item.quantity,
       v_sale.number, 'Salida por venta ' || v_sale.number, v_sale.created_by);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- VISTAS PARA DASHBOARD Y REPORTES
-- ----------------------------------------------------------------------------

-- Existencias totales por producto (suma de todos los almacenes)
create or replace view public.v_product_stock as
select
  p.id as product_id,
  p.sku,
  p.name,
  p.min_stock,
  p.total_cost,
  p.wholesale_price,
  coalesce(sum(s.quantity), 0)::int as total_quantity,
  coalesce(sum(s.quantity), 0) * p.total_cost as stock_value
from public.products p
left join public.inventory_stock s on s.product_id = p.id
where p.is_active
group by p.id;

-- Productos agotados o con inventario bajo
create or replace view public.v_low_stock as
select * from public.v_product_stock
where total_quantity <= min_stock
order by total_quantity asc;

-- Productos más vendidos (solo facturas no canceladas)
create or replace view public.v_top_products as
select
  p.id as product_id,
  p.sku,
  p.name,
  sum(si.quantity)::int as units_sold,
  sum(si.total) as revenue
from public.sale_items si
join public.sales s on s.id = si.sale_id
join public.products p on p.id = si.product_id
where s.doc_type = 'factura' and s.status <> 'cancelado'
group by p.id
order by units_sold desc;

-- Balance pendiente por cliente
create or replace view public.v_customer_balance as
select
  c.id as customer_id,
  c.name,
  c.company,
  coalesce(sum(s.total - s.paid_amount), 0) as balance
from public.customers c
left join public.sales s
  on s.customer_id = c.id
 and s.doc_type = 'factura'
 and s.status <> 'cancelado'
group by c.id;

-- ----------------------------------------------------------------------------
-- RPC: estadísticas del dashboard en una sola llamada
-- ----------------------------------------------------------------------------

create or replace function public.get_dashboard_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'sales_today', coalesce((
      select sum(total) from public.sales
      where doc_type = 'factura' and status <> 'cancelado'
        and created_at >= date_trunc('day', now())
    ), 0),
    'sales_month', coalesce((
      select sum(total) from public.sales
      where doc_type = 'factura' and status <> 'cancelado'
        and created_at >= date_trunc('month', now())
    ), 0),
    'out_of_stock', (select count(*) from public.v_product_stock where total_quantity = 0),
    'low_stock', (select count(*) from public.v_low_stock where total_quantity > 0),
    'total_products', (select count(*) from public.products where is_active),
    'total_customers', (select count(*) from public.customers where is_active),
    'inventory_value', coalesce((select sum(stock_value) from public.v_product_stock), 0)
  );
$$;

-- ============================================================================
-- TSUNAMI ERP — Migración 0003: Seguridad a nivel de fila (RLS)
--
-- Modelo de permisos por rol (Módulo 8):
--   admin        → acceso total
--   gerente      → acceso total excepto gestión de usuarios
--   ventas       → clientes, ventas, catálogo (lectura de productos)
--   almacen      → inventario y productos
--   contabilidad → lectura general + pagos
-- ============================================================================

-- Helper: rol del usuario autenticado
create or replace function public.auth_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select public.auth_role() = 'admin';
$$;

create or replace function public.is_manager_or_admin()
returns boolean language sql stable as $$
  select public.auth_role() in ('admin', 'gerente');
$$;

-- Habilitar RLS en todas las tablas
alter table public.profiles                enable row level security;
alter table public.company_settings        enable row level security;
alter table public.brands                  enable row level security;
alter table public.categories              enable row level security;
alter table public.suppliers               enable row level security;
alter table public.warehouses              enable row level security;
alter table public.products                enable row level security;
alter table public.product_images          enable row level security;
alter table public.customers               enable row level security;
alter table public.customer_special_prices enable row level security;
alter table public.inventory_stock         enable row level security;
alter table public.inventory_movements     enable row level security;
alter table public.document_counters       enable row level security;
alter table public.sales                   enable row level security;
alter table public.sale_items              enable row level security;
alter table public.payments                enable row level security;
alter table public.imports                 enable row level security;
alter table public.import_items            enable row level security;
alter table public.import_documents        enable row level security;
alter table public.notifications           enable row level security;

-- ----------------------------------------------------------------------------
-- PERFILES: cada usuario ve su perfil; admin gestiona todos
-- ----------------------------------------------------------------------------
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin());

create policy "profiles_admin_all" on public.profiles
  for all to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- CONFIGURACIÓN: lectura para todos, escritura solo admin/gerente
-- ----------------------------------------------------------------------------
create policy "settings_select" on public.company_settings
  for select to authenticated using (true);

create policy "settings_write" on public.company_settings
  for all to authenticated using (public.is_manager_or_admin());

-- ----------------------------------------------------------------------------
-- CATÁLOGOS BASE Y PRODUCTOS: lectura para todos los autenticados;
-- escritura para admin, gerente y almacén
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['brands','categories','suppliers','warehouses','products','product_images'] loop
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (true)', t);
    execute format(
      'create policy "%1$s_write" on public.%1$s for all to authenticated
       using (public.auth_role() in (''admin'',''gerente'',''almacen''))', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- CLIENTES: lectura todos; escritura admin, gerente y ventas
-- ----------------------------------------------------------------------------
create policy "customers_select" on public.customers
  for select to authenticated using (true);

create policy "customers_write" on public.customers
  for all to authenticated using (public.auth_role() in ('admin','gerente','ventas'));

create policy "special_prices_select" on public.customer_special_prices
  for select to authenticated using (true);

create policy "special_prices_write" on public.customer_special_prices
  for all to authenticated using (public.auth_role() in ('admin','gerente','ventas'));

-- ----------------------------------------------------------------------------
-- INVENTARIO: lectura todos; movimientos admin, gerente y almacén
-- ----------------------------------------------------------------------------
create policy "stock_select" on public.inventory_stock
  for select to authenticated using (true);

create policy "stock_write" on public.inventory_stock
  for all to authenticated using (public.auth_role() in ('admin','gerente','almacen'));

create policy "movements_select" on public.inventory_movements
  for select to authenticated using (true);

create policy "movements_insert" on public.inventory_movements
  for insert to authenticated
  with check (public.auth_role() in ('admin','gerente','almacen','ventas'));

-- ----------------------------------------------------------------------------
-- VENTAS: lectura todos; escritura admin, gerente y ventas
-- ----------------------------------------------------------------------------
create policy "counters_all" on public.document_counters
  for all to authenticated using (true);

create policy "sales_select" on public.sales
  for select to authenticated using (true);

create policy "sales_write" on public.sales
  for all to authenticated using (public.auth_role() in ('admin','gerente','ventas'));

create policy "sale_items_select" on public.sale_items
  for select to authenticated using (true);

create policy "sale_items_write" on public.sale_items
  for all to authenticated using (public.auth_role() in ('admin','gerente','ventas'));

create policy "payments_select" on public.payments
  for select to authenticated using (true);

create policy "payments_write" on public.payments
  for all to authenticated
  using (public.auth_role() in ('admin','gerente','ventas','contabilidad'));

-- ----------------------------------------------------------------------------
-- IMPORTACIONES: lectura todos; escritura admin y gerente
-- ----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['imports','import_items','import_documents'] loop
    execute format('create policy "%1$s_select" on public.%1$s for select to authenticated using (true)', t);
    execute format(
      'create policy "%1$s_write" on public.%1$s for all to authenticated
       using (public.is_manager_or_admin())', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- NOTIFICACIONES: cada usuario ve y gestiona las suyas
-- ----------------------------------------------------------------------------
create policy "notifications_own" on public.notifications
  for all to authenticated using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- TSUNAMI ERP — Migración 0004: Datos iniciales
-- ============================================================================

insert into public.company_settings (id, name, country, currency, currency_symbol, tax_name, tax_rate)
values (1, 'TSUNAMI IMPORT, SRL', 'República Dominicana', 'DOP', 'RD$', 'ITBIS', 18.00)
on conflict (id) do nothing;

insert into public.warehouses (name, code, is_default)
values ('Almacén Principal', 'ALM-01', true)
on conflict (code) do nothing;

insert into public.categories (name) values
  ('Camisetas'),
  ('Pantalones'),
  ('Vestidos'),
  ('Ropa Interior'),
  ('Ropa Deportiva'),
  ('Ropa Infantil'),
  ('Accesorios')
on conflict do nothing;

-- Buckets de almacenamiento (fotos de productos, logo y documentos).
-- Protegidos con manejo de errores: si el panel no permite crearlos por SQL,
-- la instalación continúa y se crean luego desde la sección Storage.
do $$ begin
  insert into storage.buckets (id, name, public)
  values
    ('products', 'products', true),
    ('company', 'company', true),
    ('documents', 'documents', false)
  on conflict (id) do nothing;
exception when others then
  raise notice 'Aviso: no se pudieron crear los buckets por SQL (%). Crearlos desde Storage.', sqlerrm;
end $$;

do $$ begin
  create policy "storage_public_read" on storage.objects
    for select using (bucket_id in ('products', 'company'));
  create policy "storage_auth_read_docs" on storage.objects
    for select to authenticated using (bucket_id = 'documents');
  create policy "storage_auth_write" on storage.objects
    for insert to authenticated with check (true);
  create policy "storage_auth_update" on storage.objects
    for update to authenticated using (true);
  create policy "storage_auth_delete" on storage.objects
    for delete to authenticated using (true);
exception when others then
  raise notice 'Aviso: no se pudieron crear las políticas de Storage por SQL (%).', sqlerrm;
end $$;

-- ============================================================================
-- VERIFICACIÓN FINAL — el resultado debe ser: 20 | 4 | 1 | 7
-- ============================================================================

select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE') as tablas,
  (select count(*) from information_schema.views
    where table_schema = 'public') as vistas,
  (select count(*) from public.warehouses) as almacenes,
  (select count(*) from public.categories) as categorias;
