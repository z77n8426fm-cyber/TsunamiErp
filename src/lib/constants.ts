import type { ImportStatus, MovementType, SaleDocType, SaleStatus, UserRole } from "@/lib/types";

/** Etiquetas legibles para cada rol de usuario. */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  gerente: "Gerente",
  ventas: "Ventas",
  almacen: "Almacén",
  contabilidad: "Contabilidad",
};

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  despachado: "Despachado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

/** Colores de badge por estado de venta (clases Tailwind). */
export const SALE_STATUS_STYLES: Record<SaleStatus, string> = {
  pendiente: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  confirmado: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  despachado: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-400",
  entregado: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  cancelado: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
};

export const DOC_TYPE_LABELS: Record<SaleDocType, string> = {
  cotizacion: "Cotización",
  pedido: "Pedido",
  factura: "Factura",
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
  transferencia: "Transferencia",
};

export const MOVEMENT_STYLES: Record<MovementType, string> = {
  entrada: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  salida: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  ajuste: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  transferencia: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
};

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  borrador: "Borrador",
  confirmada: "Confirmada",
  en_transito: "En Tránsito",
  en_aduana: "En Aduana",
  recibida: "Recibida",
  cancelada: "Cancelada",
};

export const IMPORT_STATUS_STYLES: Record<ImportStatus, string> = {
  borrador: "bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-400",
  confirmada: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400",
  en_transito: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-400",
  en_aduana: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
  recibida: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  cancelada: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
};

export const PAYMENT_METHOD_LABELS = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  cheque: "Cheque",
  tarjeta: "Tarjeta",
  credito: "Crédito",
} as const;

export const PROVINCES_DO = [
  "Azua", "Bahoruco", "Barahona", "Dajabón", "Distrito Nacional", "Duarte",
  "El Seibo", "Elías Piña", "Espaillat", "Hato Mayor", "Hermanas Mirabal",
  "Independencia", "La Altagracia", "La Romana", "La Vega", "María Trinidad Sánchez",
  "Monseñor Nouel", "Monte Cristi", "Monte Plata", "Pedernales", "Peravia",
  "Puerto Plata", "Samaná", "San Cristóbal", "San José de Ocoa", "San Juan",
  "San Pedro de Macorís", "Sánchez Ramírez", "Santiago", "Santiago Rodríguez",
  "Santo Domingo", "Valverde",
];
