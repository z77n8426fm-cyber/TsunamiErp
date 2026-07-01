# Arquitectura — TSUNAMI ERP

## Visión general

TSUNAMI ERP es una aplicación **Next.js 15 (App Router)** desplegada en Vercel,
con **Supabase** como backend (PostgreSQL + Auth + Storage). No hay servidor
propio que mantener: la lógica corre en Server Components, Route Handlers y en
la propia base de datos (funciones y triggers).

```
┌────────────┐     HTTPS      ┌──────────────────────────┐
│  Navegador  │ ─────────────▶ │  Vercel (Next.js 15)     │
│ (PC/tablet/ │ ◀───────────── │  · Server Components     │
│  celular)   │                │  · Route Handler /api/ai │
└────────────┘                └──────────┬───────────────┘
                                          │ supabase-js (+ cookies de sesión)
                              ┌──────────▼───────────────┐
                              │  Supabase                 │
                              │  · PostgreSQL + RLS       │
                              │  · Auth (email/password)  │
                              │  · Storage (fotos, logo)  │
                              └───────────────────────────┘
                                          ▲
                              ┌───────────┴──────────────┐
                              │  API de Anthropic (IA)    │
                              └───────────────────────────┘
```

## Decisiones clave

### Seguridad en la base de datos, no solo en la interfaz
Todas las tablas tienen **Row Level Security**. Los permisos por rol
(admin, gerente, ventas, almacén, contabilidad) se definen en
`supabase/migrations/0003_rls.sql`. Aunque un usuario manipule el cliente,
la base de datos rechaza operaciones fuera de su rol. La interfaz además
oculta módulos según el rol (`src/components/layout/nav-items.ts`).

### Lógica de inventario en PostgreSQL
Los movimientos de inventario (`inventory_movements`) actualizan las
existencias (`inventory_stock`) mediante el trigger `apply_inventory_movement`
(`0002_functions_triggers.sql`). Esto garantiza consistencia sin importar
desde dónde se inserte el movimiento (formulario, recepción de importación,
facturación) e impide existencias negativas a nivel de motor.

### Numeración de documentos atómica
`document_counters` + `next_document_number()` generan `COT-000001`,
`PED-000001`, `FAC-000001` de forma atómica (sin duplicados bajo concurrencia).

### Server Components primero
Las páginas de listado y detalle son Server Components que consultan Supabase
con la sesión del usuario (cookies vía `@supabase/ssr`). Los formularios son
Client Components que mutan directamente con el cliente de navegador — seguro
gracias a RLS — y refrescan con `router.refresh()`.

### Middleware de sesión
`src/middleware.ts` refresca el token de Supabase en cada petición y redirige
a `/login` cuando no hay sesión. Las rutas públicas son `/login` y `/registro`.

### Asistente IA con tool use
`/api/ai` conecta Claude con seis herramientas que consultan la base de datos
**con la sesión del usuario** (las RLS aplican también a la IA). El modelo
decide qué herramienta usar y responde en español con datos reales.

## Convenciones de código

- **Idiomas**: identificadores en inglés, interfaz y comentarios en español.
- **Rutas**: en español (`/inventario`, `/ventas/nueva`) por ser la lengua del negocio.
- **Tipos**: `src/lib/types.ts` refleja el esquema SQL; los `select` con
  relaciones se castean a estos tipos.
- **Diseño**: tokens semánticos (`--surface`, `--border`, `--muted`) definidos
  en `globals.css`; los componentes usan clases `bg-surface`, `text-muted`, etc.
  La paleta de marca es `brand-*` (azul profundo).
- **Responsive**: mobile-first; el sidebar se convierte en drawer bajo `lg`.

## Escalabilidad

- Índices en todas las llaves foráneas y búsquedas (`GIN` con `to_tsvector`
  para texto en español).
- Listados con paginación por rango (`.range()`), preparados para miles de filas.
- Vistas (`v_product_stock`, `v_top_products`, `v_low_stock`,
  `v_customer_balance`) y RPC (`get_dashboard_stats`) evitan N+1 y calculan
  agregados en el servidor de base de datos.
- Nuevos módulos = nueva carpeta en `src/app/(app)/` + tablas con RLS.
