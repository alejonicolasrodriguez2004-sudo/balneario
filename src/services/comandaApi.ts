import { invokeCommand } from './apiClient';
import {
  ComandaDto,
  EstadoComanda,
  ItemComandaInput,
  ProductoDto,
  UbicacionDto,
} from '../types/comanda';

export interface CatalogosResponse {
  ubicaciones: UbicacionDto[];
  productos: ProductoDto[];
}

export const comandaApi = {
  async obtenerCatalogos(): Promise<CatalogosResponse> {
    return invokeCommand<CatalogosResponse>('obtener_catalogos_referencia');
  },

  async crearComanda(payload: {
    ubicacion_id: string;
    items: ItemComandaInput[];
    operador: string;
    token_idempotencia?: string;
  }): Promise<ComandaDto> {
    return invokeCommand<ComandaDto>('crear_comanda', { payload });
  },

  async listarComandas(filtros?: {
    filtro_estado?: EstadoComanda | 'Todas';
    filtro_ubicacion_id?: string;
  }): Promise<ComandaDto[]> {
    return invokeCommand<ComandaDto[]>('listar_comandas', { payload: filtros || {} });
  },

  async obtenerComanda(comandaId: number): Promise<ComandaDto> {
    return invokeCommand<ComandaDto>('obtener_comanda', { comandaId });
  },

  async agregarItems(payload: {
    comanda_id: number;
    items: ItemComandaInput[];
    operador: string;
  }): Promise<ComandaDto> {
    return invokeCommand<ComandaDto>('agregar_items_comanda', { payload });
  },

  async anularComanda(payload: {
    comanda_id: number;
    motivo: string;
    operador: string;
  }): Promise<ComandaDto> {
    return invokeCommand<ComandaDto>('anular_comanda', { payload });
  },

  async cerrarComanda(payload: {
    comanda_id: number;
    operador: string;
  }): Promise<ComandaDto> {
    return invokeCommand<ComandaDto>('cerrar_comanda', { payload });
  },

  async cancelarItem(payload: {
    comanda_id: number;
    item_id: number;
    motivo: string;
    operador: string;
  }): Promise<ComandaDto> {
    return invokeCommand<ComandaDto>('cancelar_item_comanda', { payload });
  },
};

