// src/services/catalogoApi.ts
// Servicio frontend para operaciones de Catálogo de Productos y Precios (Feature 003)

import { invokeCommand } from './apiClient';
import {
  ActualizarPrecioRequest,
  ActualizarProductoRequest,
  CambiarDisponibilidadRequest,
  CatalogoCompletoDto,
  CategoriaDto,
  CrearProductoRequest,
  DarBajaProductoRequest,
  HistorialPrecioDto,
  ProductoDto,
} from '../types/catalogo';

export const catalogoApi = {
  /**
   * Obtiene el catálogo comercial completo clasificado por categorías
   */
  async listarCatalogoCompleto(incluirInactivos: boolean = false): Promise<CatalogoCompletoDto> {
    return invokeCommand<CatalogoCompletoDto>('listar_catalogo_completo', {
      payload: { incluir_inactivos: incluirInactivos },
    });
  },

  /**
   * Da de alta un nuevo producto con validación de precio y slug único
   */
  async crearProducto(request: CrearProductoRequest): Promise<ProductoDto> {
    return invokeCommand<ProductoDto>('crear_producto', {
      payload: request,
    });
  },

  /**
   * Actualiza los datos generales de un producto existente (nombre, categoría, descripción)
   */
  async actualizarProducto(request: ActualizarProductoRequest): Promise<ProductoDto> {
    return invokeCommand<ProductoDto>('actualizar_producto', {
      payload: request,
    });
  },

  /**
   * Actualiza el precio de venta vigente blindando el historial previo (Constitución Art. VI)
   */
  async actualizarPrecioProducto(request: ActualizarPrecioRequest): Promise<ProductoDto> {
    return invokeCommand<ProductoDto>('actualizar_precio_producto', {
      payload: request,
    });
  },

  /**
   * Pausa o reactiva en un solo toque la disponibilidad de un producto
   */
  async cambiarDisponibilidadProducto(request: CambiarDisponibilidadRequest): Promise<ProductoDto> {
    return invokeCommand<ProductoDto>('cambiar_disponibilidad_producto', {
      payload: request,
    });
  },

  /**
   * Aplica baja lógica a un producto sin romper claves foráneas de comandas previas
   */
  async darBajaProducto(request: DarBajaProductoRequest): Promise<ProductoDto> {
    return invokeCommand<ProductoDto>('dar_baja_producto', {
      payload: request,
    });
  },

  /**
   * Consulta el historial inmutable de variaciones de precio de un producto
   */
  async obtenerHistorialPrecios(productoId: string): Promise<HistorialPrecioDto[]> {
    return invokeCommand<HistorialPrecioDto[]>('obtener_historial_precios', {
      payload: { producto_id: productoId },
    });
  },

  /**
   * Lista todas las categorías activas u ocultas
   */
  async listarCategorias(soloActivas: boolean = true): Promise<CategoriaDto[]> {
    return invokeCommand<CategoriaDto[]>('listar_categorias', {
      payload: { solo_activas: soloActivas },
    });
  },

  /**
   * Crea o actualiza una categoría en el catálogo
   */
  async guardarCategoria(categoria: CategoriaDto): Promise<CategoriaDto> {
    return invokeCommand<CategoriaDto>('guardar_categoria', {
      payload: categoria,
    });
  },
};

