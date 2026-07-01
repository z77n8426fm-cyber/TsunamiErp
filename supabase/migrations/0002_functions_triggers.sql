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
