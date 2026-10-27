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
const mockCuentas: Array<any> = [];

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

    case 'abrir_cuenta': {
      const payload = args.payload;
      const u = mockUbicaciones.find((ub) => ub.id === payload.ubicacion_id);
      if (!u) throw new Error('Ubicación no encontrada');
      const comandas = mockComandas.filter((c) => c.ubicacion_id === payload.ubicacion_id && c.estado === 'Abierta');
      if (comandas.length === 0) throw new Error('No hay comandas pendientes para liquidar en esta ubicación');
      const total = comandas.reduce((acc, c) => acc + c.total, 0);
      const cuenta = {
        id: (mockCuentas.length + 1),
        codigo_visible: `CTA-LOCAL-${String(mockCuentas.length + 1).padStart(4, '0')}`,
        ubicacion_id: u.id,
        ubicacion_nombre: u.nombre,
        estado: 'Abierta',
        total,
        saldo_pendiente: total,
        creado_por: payload.operador || 'Operador',
        creado_en: new Date().toISOString(),
        comandas_asociadas: comandas.map((c) => ({ comanda_id: c.id, codigo_visible: c.codigo_visible, total: c.total })),
        pagos: [],
      };
      mockCuentas.push(cuenta);
      return cuenta as T;
    }

    case 'obtener_cuenta': {
      const payload = args.payload;
      const c = mockCuentas.find((x) => x.id === payload.cuenta_id);
      if (!c) throw new Error('Cuenta no encontrada');
      return c as T;
    }

    case 'listar_cuentas_activas': {
      return mockCuentas.filter((c) => c.estado === 'Abierta' || c.estado === 'Pagada') as T;
    }

    case 'registrar_pago': {
      const payload = args.payload;
      const c = mockCuentas.find((x) => x.id === payload.cuenta_id);
      if (!c) throw new Error('Cuenta no encontrada');
      if (payload.monto <= 0) throw new Error('El monto debe ser positivo');
      if (payload.monto > c.saldo_pendiente + 0.01) throw new Error('El monto excede el saldo pendiente');

      let vuelto = 0;
      if (payload.medio_pago === 'Efectivo' && payload.monto_entregado) {
        if (payload.monto_entregado < payload.monto) throw new Error('El monto entregado es menor al monto a pagar');
        vuelto = Math.round((payload.monto_entregado - payload.monto) * 100) / 100;
      }

      const nuevoPago = {
        id: c.pagos.length + 1,
        cuenta_id: c.id,
        medio_pago: payload.medio_pago,
        monto: payload.monto,
        monto_entregado: payload.monto_entregado || null,
        vuelto: vuelto || null,
        referencia_externa: payload.referencia_externa || null,
        estado: 'Activo',
        creado_por: payload.operador || 'Operador',
        creado_en: new Date().toISOString(),
      };
      c.pagos.push(nuevoPago);
      c.saldo_pendiente = Math.max(0, Math.round((c.saldo_pendiente - payload.monto) * 100) / 100);
      if (c.saldo_pendiente === 0) c.estado = 'Pagada';

      return {
        cuenta_actualizada: c,
        pago_registrado: nuevoPago,
        vuelto_a_entregar: vuelto,
      } as T;
    }

    case 'cerrar_cuenta_y_liberar': {
      const payload = args.payload;
      const c = mockCuentas.find((x) => x.id === payload.cuenta_id);
      if (!c) throw new Error('Cuenta no encontrada');
      if (c.saldo_pendiente > 0.01) throw new Error('No se puede cerrar una cuenta con saldo pendiente');
      c.estado = 'Cerrada';
      c.cerrado_en = new Date().toISOString();
      return c as T;
    }

    case 'anular_pago': {
      const payload = args.payload;
      const c = mockCuentas.find((x) => x.id === payload.cuenta_id);
      if (!c) throw new Error('Cuenta no encontrada');
      const p = c.pagos.find((x: any) => x.id === payload.pago_id);
      if (!p) throw new Error('Pago no encontrado');
      if (payload.motivo.trim().length < 4) throw new Error('Motivo obligatorio (mínimo 4 caracteres)');
      p.estado = 'Cancelado';
      p.motivo_anulacion = payload.motivo.trim();
      p.cancelado_por = payload.operador;
      p.cancelado_en = new Date().toISOString();

      const totalActivo = c.pagos
        .filter((x: any) => x.estado === 'Activo')
        .reduce((acc: number, x: any) => acc + x.monto, 0);
      c.saldo_pendiente = Math.round((c.total - totalActivo) * 100) / 100;
      c.estado = c.saldo_pendiente === 0 ? 'Pagada' : 'Abierta';
      return c as T;
    }

    case 'anular_cuenta': {
      const payload = args.payload;
      const c = mockCuentas.find((x) => x.id === payload.cuenta_id);
      if (!c) throw new Error('Cuenta no encontrada');
      const pagosActivos = c.pagos.filter((x: any) => x.estado === 'Activo');
      if (pagosActivos.length > 0) throw new Error('No se puede anular una cuenta con pagos activos');
      if (payload.motivo.trim().length < 4) throw new Error('Motivo obligatorio');
      c.estado = 'Anulada';
      c.motivo_anulacion = payload.motivo.trim();
      c.anulado_por = payload.operador;
      c.anulado_en = new Date().toISOString();
      return c as T;
    }

    case 'obtener_resumen_arqueo': {
      let efectivo = 0;
      let debito = 0;
      let credito = 0;
      let transf = 0;
      let activos = 0;
      let anulados = 0;

      for (const c of mockCuentas) {
        for (const p of c.pagos) {
          if (p.estado === 'Activo') {
            activos++;
            if (p.medio_pago === 'Efectivo') efectivo += p.monto;
            else if (p.medio_pago === 'Tarjeta Débito') debito += p.monto;
            else if (p.medio_pago === 'Tarjeta Crédito') credito += p.monto;
            else if (p.medio_pago === 'Transferencia') transf += p.monto;
          } else {
            anulados++;
          }
        }
      }

      return {
        total_efectivo: efectivo,
        total_debito: debito,
        total_credito: credito,
        total_transferencia: transf,
        total_recaudado: efectivo + debito + credito + transf,
        cantidad_pagos_activos: activos,
        cantidad_pagos_anulados: anulados,
      } as T;
    }

    default:
      throw new Error(`Comando no reconocido: ${cmd}`);
  }
}

