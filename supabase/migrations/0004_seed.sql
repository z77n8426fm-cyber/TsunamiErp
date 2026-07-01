-- ============================================================================
-- TSUNAMI ERP — Migración 0004: Datos iniciales
-- Configuración base para arrancar el sistema (no incluye datos de prueba).
-- ============================================================================

-- Configuración de la empresa
insert into public.company_settings (id, name, country, currency, currency_symbol, tax_name, tax_rate)
values (1, 'TSUNAMI IMPORT, SRL', 'República Dominicana', 'DOP', 'RD$', 'ITBIS', 18.00)
on conflict (id) do nothing;

-- Almacén principal
insert into public.warehouses (name, code, is_default)
values ('Almacén Principal', 'ALM-01', true)
on conflict (code) do nothing;

-- Categorías típicas de ropa al por mayor (editables desde el sistema)
insert into public.categories (name) values
  ('Camisetas'),
  ('Pantalones'),
  ('Vestidos'),
  ('Ropa Interior'),
  ('Ropa Deportiva'),
  ('Ropa Infantil'),
  ('Accesorios')
on conflict do nothing;

-- Buckets de almacenamiento para imágenes de productos, logo y documentos
insert into storage.buckets (id, name, public)
values
  ('products', 'products', true),
  ('company', 'company', true),
  ('documents', 'documents', false)
on conflict (id) do nothing;

-- Políticas de acceso al almacenamiento
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
