# Base de datos — TSUNAMI ERP

PostgreSQL (Supabase), esquema normalizado. Migraciones en `supabase/migrations/`.

## Diagrama de entidades (resumen)

```
profiles (auth.users) ─┐
                       ├─ created_by en ventas, movimientos, importaciones
company_settings (1 fila)

brands ──┐
categories (self-ref: subcategorías) ──┤
suppliers ──┤
             ├──▶ products ──▶ product_images
warehouses ─┤        │
             │        ├──▶ inventory_stock (product × warehouse)
             │        └──▶ inventory_movements (entrada/salida/ajuste/transferencia)
customers ──┤
             ├──▶ customer_special_prices (precio por cliente)
             ├──▶ sales ──▶ sale_items ──▶ products
             │      └──▶ payments (recibos)
             └──▶ imports ──▶ import_items ──▶ products
                     └──▶ import_documents
notifications
document_counters (numeración COT/PED/FAC)
```

## Tablas principales

| Tabla | Propósito |
| --- | --- |
| `profiles` | Usuario + rol (`admin`, `gerente`, `ventas`, `almacen`, `contabilidad`). Se crea por trigger al registrarse; el primero es admin. |
| `products` | Ficha completa: SKU, barcode, marca, categoría/subcategoría, color, talla, material, origen, proveedor, costos (FOB + gastos → `total_cost` generado), precios, mínimo. |
| `inventory_stock` | Existencias por producto y almacén (PK compuesta). Actualizada exclusivamente por trigger. |
| `inventory_movements` | Historial inmutable. `entrada` suma, `salida`/`transferencia` restan (validando existencias), `ajuste` fija la cantidad contada. |
| `sales` | Un documento por fila: `doc_type` (cotización/pedido/factura) + `status` (pendiente→entregado/cancelado). Números atómicos por tipo. |
| `sale_items` | Líneas con `total` generado `(cantidad × precio) − descuento`. |
| `payments` | Recibos de pago aplicados a facturas. |
| `imports` | PO internacional: BL, contenedor, ETA/ETD, puerto, naviera, costos desglosados con `total_cost` generado. |
| `customer_special_prices` | Precio especial por cliente y producto (se aplica automáticamente al vender). |

## Funciones y triggers

| Objeto | Descripción |
| --- | --- |
| `handle_new_user()` | Crea el perfil al registrarse; primer usuario = admin. |
| `next_document_number(tipo)` | Numeración atómica `COT-000001`, `PED-…`, `FAC-…`. |
| `apply_inventory_movement()` | Aplica cada movimiento a `inventory_stock`; bloquea existencias negativas. |
| `deduct_stock_for_sale(sale_id)` | Genera salidas de inventario por cada línea de una factura. |
| `get_dashboard_stats()` | JSON con ventas de hoy/mes, agotados, bajos, totales y valor del inventario. |
| `set_updated_at()` | Mantiene `updated_at` en todas las tablas editables. |

## Vistas

- `v_product_stock` — existencias y valor por producto (suma de almacenes).
- `v_low_stock` — agotados o bajo el mínimo (alertas y reorden).
- `v_top_products` — unidades e ingresos por producto facturado.
- `v_customer_balance` — cuentas por cobrar por cliente.

## Seguridad (RLS)

Cada tabla tiene políticas por rol; ver `0003_rls.sql`. Regla general:

| Recurso | Lectura | Escritura |
| --- | --- | --- |
| Productos, inventario | todos | admin, gerente, almacén |
| Clientes, ventas | todos | admin, gerente, ventas |
| Pagos | todos | + contabilidad |
| Importaciones | todos | admin, gerente |
| Usuarios, configuración | todos | admin (config: + gerente) |

## Storage

Buckets creados en `0004_seed.sql`:

- `products` (público) — fotografías de productos.
- `company` (público) — logo de la empresa.
- `documents` (privado) — documentos de importación (BL, facturas, packing lists).
