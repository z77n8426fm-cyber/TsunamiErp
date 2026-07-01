# TSUNAMI ERP

Sistema de gestión empresarial (ERP) de **TSUNAMI IMPORT, SRL** — importación y venta al por mayor de ropa en República Dominicana.

Aplicación web moderna, rápida y responsive (computadora, tablet y celular), construida con:

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript |
| Estilos | Tailwind CSS 4 · modo claro/oscuro · diseño azul oscuro/blanco/gris |
| Base de datos | Supabase (PostgreSQL) con Row Level Security |
| Autenticación | Supabase Auth (correo + contraseña, sesión por cookies) |
| Gráficas | Recharts |
| Asistente IA | API de Anthropic (Claude) con tool use sobre la base de datos |
| Despliegue | Vercel |

## Módulos

1. **Dashboard** — ventas del día/mes, agotados, inventario bajo, valor del inventario, más vendidos, últimas ventas y movimientos, gráfica de 30 días.
2. **Inventario** — productos con fotos, SKU, código de barras, QR, costos FOB/importación, precios (sugerido, mayor, unidad, especial por cliente), entradas/salidas/ajustes/transferencias, multialmacén, mínimos y alertas.
3. **Catálogo** — vista comercial con buscador y filtros por categoría, marca, color, talla y precio.
4. **Clientes** — directorio con RNC, WhatsApp, Instagram, historial de compras/cotizaciones/facturas y balance pendiente.
5. **Ventas** — cotizaciones, pedidos y facturas con descuentos, ITBIS, recibos de pago, estados (pendiente → entregado) y envío por WhatsApp/correo.
6. **Importaciones** — PO, factura comercial, packing list, BL, contenedor, ETA/ETD, puerto, naviera, costos (FOB, flete, seguro, aduanas) y recepción a inventario.
7. **Reportes** — ventas, utilidad, margen, más vendidos, productos lentos, inventario valorizado y cuentas por cobrar; exportables a Excel (CSV) y PDF.
8. **Usuarios** — roles: Administrador, Gerente, Ventas, Almacén y Contabilidad, con permisos aplicados en base de datos (RLS) y en la interfaz.
9. **Configuración** — logo, datos de la empresa, moneda, impuestos, almacenes, marcas y categorías.
10. **Asistente IA** — preguntas en lenguaje natural ("¿cuántas camisetas negras talla L tengo?") respondidas con datos reales del ERP.

## Puesta en marcha

### 1. Crear el proyecto de Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta en orden los archivos de `supabase/migrations/`:
   `0001_schema.sql` → `0002_functions_triggers.sql` → `0003_rls.sql` → `0004_seed.sql`.
3. En **Authentication → Providers** habilita *Email* (activa la confirmación de correo si lo deseas).

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Completa los valores desde *Supabase → Settings → API* y agrega tu clave de Anthropic para el asistente IA.

### 3. Ejecutar en desarrollo

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>, regístrate desde **/registro** — **el primer usuario creado es Administrador automáticamente** — y comienza a usar el sistema.

### 4. Desplegar en Vercel

1. Importa el repositorio en [vercel.com](https://vercel.com).
2. Configura las mismas variables de entorno de `.env.example`.
3. Despliega. Cada push a `main` publica automáticamente.

## Estructura del proyecto

```
supabase/migrations/   Esquema SQL, funciones, triggers, RLS y datos iniciales
src/
├── app/
│   ├── (auth)/        Login y registro
│   ├── (app)/         Módulos protegidos (dashboard, inventario, ventas...)
│   └── api/ai/        Endpoint del asistente IA
├── components/        UI reutilizable y componentes por módulo
├── lib/
│   ├── supabase/      Clientes browser/server/middleware
│   ├── types.ts       Tipos de dominio
│   ├── constants.ts   Etiquetas y estilos de estados
│   └── utils.ts       Formato de moneda, fechas, SKU
└── middleware.ts      Protección de rutas y refresco de sesión
```

Documentación adicional en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) y [`docs/DATABASE.md`](docs/DATABASE.md).
