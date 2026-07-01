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
