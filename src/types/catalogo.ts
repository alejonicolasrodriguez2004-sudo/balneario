// src/types/catalogo.ts
// Tipos TypeScript para Catálogo de Productos, Categorías y Precios (Feature 003)

export interface CategoriaDto {
  id: string;
  nombre: string;
  icono?: string | null;
  orden: number;
  activo: boolean;
}

export interface ProductoDto {
  id: string;
  nombre: string;
  categoria: string;
  precio_actual: number;
  disponible_para_venta: boolean;
  descripcion?: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface HistorialPrecioDto {
  id: number;
  producto_id: string;
  precio_anterior: number;
  precio_nuevo: number;
  fecha_cambio: string;
  usuario: string;
  motivo?: string | null;
}

export interface CatalogoCompletoDto {
  categorias: CategoriaDto[];
  productos: ProductoDto[];
}

export interface CrearProductoRequest {
  id?: string | null;
  nombre: string;
  categoria: string;
  precio_actual: number;
  descripcion?: string | null;
  operador: string;
}

export interface ActualizarProductoRequest {
  id: string;
  nombre: string;
  categoria: string;
  descripcion?: string | null;
  operador: string;
}

export interface ActualizarPrecioRequest {
  producto_id: string;
  nuevo_precio: number;
  motivo?: string | null;
  operador: string;
}

export interface CambiarDisponibilidadRequest {
  producto_id: string;
  disponible: boolean;
}

export interface DarBajaProductoRequest {
  producto_id: string;
  operador: string;
}

