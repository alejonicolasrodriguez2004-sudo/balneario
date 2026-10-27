export type EstadoComanda = 'Borrador' | 'Abierta' | 'Cerrada' | 'Anulada';
export type EstadoItem = 'Activo' | 'Cancelado';
export type TipoUbicacion = 'Carpa' | 'Sombrilla' | 'Mesa' | 'Reposera' | 'Mostrador';

export interface UbicacionDto {
  id: string;
  tipo: TipoUbicacion;
  numero: number;
  nombre: string;
  activo: boolean;
}

export interface ProductoDto {
  id: string;
  nombre: string;
  categoria: string;
  precio_actual: number;
  disponible_para_venta?: boolean;
  descripcion?: string | null;
  activo: boolean;
}

export interface ItemComandaInput {
  producto_id: string;
  cantidad: number;
  observaciones?: string;
}

export interface ItemComandaDto {
  id?: number;
  comanda_id?: number;
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  observaciones?: string | null;
  estado: EstadoItem;
  motivo_cancelacion?: string | null;
  cancelado_en?: string | null;
  cancelado_por?: string | null;
  creado_en: string;
}

export interface ComandaDto {
  id?: number;
  codigo_visible: string;
  ubicacion_id: string;
  ubicacion_nombre: string;
  estado: EstadoComanda;
  total: number;
  creado_por: string;
  creado_en: string;
  cerrado_en?: string | null;
  anulado_en?: string | null;
  motivo_anulacion?: string | null;
  anulado_por?: string | null;
  token_idempotencia?: string | null;
  items: ItemComandaDto[];
}

export interface CatalogosReferenciaResponse {
  ubicaciones: UbicacionDto[];
  productos: ProductoDto[];
}

export interface ApiResponse<T> {
  success: boolean | 'true' | 'false';
  data?: T;
  error?: {
    codigo: string;
    mensaje: string;
  };
}
