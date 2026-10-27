import { ApiResponse } from '../types/comanda';

/**
 * Cliente seguro de invocación IPC para Tauri.
 * Si se ejecuta dentro del contenedor Tauri, utiliza invoke().
 * Si se ejecuta en un navegador web durante pruebas de interfaz, utiliza un mock local en memoria.
 */
export async function invokeCommand<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  // Verificación de runtime Tauri en window
  const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

  if (isTauri) {
    try {
      // Import dinámico de invoke
      const { invoke } = await import('@tauri-apps/api/core');
      const response = await invoke<ApiResponse<T>>(cmd, args);
      
      if (response && typeof response === 'object' && 'success' in response) {
        if (response.success === 'true' || (response as unknown as { success: boolean }).success === true) {
          return (response as { data: T }).data;
        } else {
          const err = (response as { error: { mensaje: string; codigo: string } }).error;
          throw new Error(err?.mensaje || 'Error desconocido del sistema');
        }
      }
      return response as T;
    } catch (e: unknown) {
      if (e instanceof Error) throw e;
      throw new Error(String(e));
    }
  }

  // Fallback para desarrollo en navegador (mock offline simulado)
  return mockInvoke<T>(cmd, args);
}

// Mock local en memoria para desarrollo web sin tauri runtime
const mockUbicaciones = [
  { id: 'carpa-01', tipo: 'Carpa' as const, numero: 1, nombre: 'Carpa 1', activo: true },
  { id: 'carpa-12', tipo: 'Carpa' as const, numero: 12, nombre: 'Carpa 12', activo: true },
  { id: 'carpa-14', tipo: 'Carpa' as const, numero: 14, nombre: 'Carpa 14', activo: true },
  { id: 'sombrilla-04', tipo: 'Sombrilla' as const, numero: 4, nombre: 'Sombrilla 4', activo: true },
  { id: 'mesa-03', tipo: 'Mesa' as const, numero: 3, nombre: 'Mesa 3', activo: true },
  { id: 'mesa-04', tipo: 'Mesa' as const, numero: 4, nombre: 'Mesa 4', activo: true },
  { id: 'mostrador-barra', tipo: 'Mostrador' as const, numero: 1, nombre: 'Barra Principal', activo: true },
];

const mockProductos = [
  { id: 'licuado-frutilla', nombre: 'Licuado de Frutilla', categoria: 'Bebidas', precio_actual: 2500, activo: true },
  { id: 'tostado-mixto', nombre: 'Tostado Mixto', categoria: 'Minutas', precio_actual: 3500, activo: true },
  { id: 'cafe-cortado', nombre: 'Café Cortado', categoria: 'Cafetería', precio_actual: 1800, activo: true },
  { id: 'agua-mineral', nombre: 'Agua Mineral 500ml', categoria: 'Bebidas', precio_actual: 1500, activo: true },
  { id: 'cerveza-artesanal', nombre: 'Cerveza Tirada 500cc', categoria: 'Bebidas', precio_actual: 3200, activo: true },
];

const mockComandas: Array<any> = [];

async function mockInvoke<T>(cmd: string, args: Record<string, any>): Promise<T> {
  await new Promise((r) => setTimeout(r, 80)); // Simula latencia ultra baja < 100ms

  switch (cmd) {
    case 'obtener_catalogos_referencia':
      return { ubicaciones: mockUbicaciones, productos: mockProductos } as T;

    case 'listar_comandas': {
      const payload = args.payload || {};
      let list = [...mockComandas];
      if (payload.filtro_estado && payload.filtro_estado !== 'Todas') {
        list = list.filter((c) => c.estado === payload.filtro_estado);
      }
      if (payload.filtro_ubicacion_id) {
        list = list.filter((c) => c.ubicacion_id === payload.filtro_ubicacion_id);
      }
      return list.reverse() as T;
    }

    case 'crear_comanda': {
      const payload = args.payload;
      const u = mockUbicaciones.find((ub) => ub.id === payload.ubicacion_id);
      if (!u) throw new Error('Ubicación no encontrada');
      if (!payload.items || payload.items.length === 0) throw new Error('La comanda debe tener al menos un producto');

      const items = payload.items.map((it: any, idx: number) => {
        const prod = mockProductos.find((p) => p.id === it.producto_id);
        const precio = prod ? prod.precio_actual : 2000;
        return {
          id: idx + 1,
          producto_id: it.producto_id,
          nombre_producto: prod ? prod.nombre : 'Producto',
          cantidad: it.cantidad,
          precio_unitario: precio,
          subtotal: it.cantidad * precio,
          observaciones: it.observaciones || null,
          estado: 'Activo',
          creado_en: new Date().toISOString(),
        };
      });

      const total = items.reduce((acc: number, item: any) => acc + item.subtotal, 0);
      const nuevaComanda = {
        id: mockComandas.length + 1,
        codigo_visible: `CMD-LOCAL-${String(mockComandas.length + 1).padStart(4, '0')}`,
        ubicacion_id: u.id,
        ubicacion_nombre: u.nombre,
        estado: 'Abierta',
        total,
        creado_por: payload.operador || 'Operador',
        creado_en: new Date().toISOString(),
        items,
      };

      mockComandas.push(nuevaComanda);
      return nuevaComanda as T;
    }

    case 'obtener_comanda': {
      const c = mockComandas.find((x) => x.id === args.comandaId);
      if (!c) throw new Error('Comanda no encontrada');
      return c as T;
    }

    case 'agregar_items_comanda': {
      const payload = args.payload;
      const c = mockComandas.find((x) => x.id === payload.comanda_id);
      if (!c) throw new Error('Comanda no encontrada');
      if (c.estado !== 'Abierta') throw new Error(`No se puede modificar una comanda ${c.estado}`);

      for (const it of payload.items) {
        const prod = mockProductos.find((p) => p.id === it.producto_id);
        const precio = prod ? prod.precio_actual : 2000;
        const nuevoItem = {
          id: c.items.length + 1,
          producto_id: it.producto_id,
          nombre_producto: prod ? prod.nombre : 'Producto',
          cantidad: it.cantidad,
          precio_unitario: precio,
          subtotal: it.cantidad * precio,
          observaciones: it.observaciones || null,
          estado: 'Activo',
          creado_en: new Date().toISOString(),
        };
        c.items.push(nuevoItem);
        c.total += nuevoItem.subtotal;
      }
      return c as T;
    }

    case 'anular_comanda': {
      const payload = args.payload;
      const c = mockComandas.find((x) => x.id === payload.comanda_id);
      if (!c) throw new Error('Comanda no encontrada');
      if (payload.motivo.trim().length < 4) throw new Error('Motivo obligatorio (mínimo 4 caracteres)');
      c.estado = 'Anulada';
      c.motivo_anulacion = payload.motivo.trim();
      c.anulado_por = payload.operador;
      c.anulado_en = new Date().toISOString();
      return c as T;
    }

    case 'cerrar_comanda': {
      const payload = args.payload;
      const c = mockComandas.find((x) => x.id === payload.comanda_id);
      if (!c) throw new Error('Comanda no encontrada');
      c.estado = 'Cerrada';
      c.cerrado_en = new Date().toISOString();
      return c as T;
    }

    case 'cancelar_item_comanda': {
      const payload = args.payload;
      const c = mockComandas.find((x) => x.id === payload.comanda_id);
      if (!c) throw new Error('Comanda no encontrada');
      const item = c.items.find((i: any) => i.id === payload.item_id);
      if (!item) throw new Error('Item no encontrado');
      if (payload.motivo.trim().length < 4) throw new Error('Motivo obligatorio');
      item.estado = 'Cancelado';
      item.motivo_cancelacion = payload.motivo.trim();
      c.total -= item.subtotal;
      return c as T;
    }

    default:
      throw new Error(`Comando no reconocido: ${cmd}`);
  }
}

