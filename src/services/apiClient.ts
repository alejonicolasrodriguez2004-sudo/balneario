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

const mockCategorias: Array<any> = [
  { id: 'bebidas', nombre: 'Bebidas', icono: 'GlassWater', orden: 1, activo: true },
  { id: 'minutas', nombre: 'Minutas', icono: 'UtensilsCrossed', orden: 2, activo: true },
  { id: 'cafeteria', nombre: 'Cafetería', icono: 'Coffee', orden: 3, activo: true },
  { id: 'postres', nombre: 'Postres', icono: 'IceCream', orden: 4, activo: true },
  { id: 'kiosco', nombre: 'Kiosco', icono: 'Candy', orden: 5, activo: true },
];

const mockProductos: Array<any> = [
  { id: 'licuado-frutilla', nombre: 'Licuado de Frutilla', categoria: 'Bebidas', precio_actual: 2500, disponible_para_venta: true, descripcion: 'Licuado al agua o con leche de frutillas frescas', activo: true, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z' },
  { id: 'tostado-mixto', nombre: 'Tostado Mixto', categoria: 'Minutas', precio_actual: 3500, disponible_para_venta: true, descripcion: 'Tostado de jamón cocido y queso en pan de miga', activo: true, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z' },
  { id: 'cafe-cortado', nombre: 'Café Cortado', categoria: 'Cafetería', precio_actual: 1800, disponible_para_venta: true, descripcion: 'Café espresso con un toque de leche espumada', activo: true, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z' },
  { id: 'agua-mineral', nombre: 'Agua Mineral 500ml', categoria: 'Bebidas', precio_actual: 1500, disponible_para_venta: true, descripcion: 'Agua mineral con o sin gas', activo: true, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z' },
  { id: 'rabas-porcion', nombre: 'Porción de Rabas', categoria: 'Minutas', precio_actual: 7500, disponible_para_venta: true, descripcion: 'Porción de rabas crocantes con limón', activo: true, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z' },
  { id: 'cerveza-artesanal', nombre: 'Cerveza Tirada 500cc', categoria: 'Bebidas', precio_actual: 3200, disponible_para_venta: true, descripcion: 'Cerveza rubia Golden artesanal tirada', activo: true, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z' },
  { id: 'medialuna-manteca', nombre: 'Medialuna de Manteca', categoria: 'Cafetería', precio_actual: 800, disponible_para_venta: true, descripcion: 'Medialuna de manteca tradicional de la costa', activo: true, creado_en: '2026-01-01T00:00:00Z', actualizado_en: '2026-01-01T00:00:00Z' },
];

const mockHistorialPrecios: Array<any> = [
  { id: 1, producto_id: 'licuado-frutilla', precio_anterior: 0, precio_nuevo: 2500, fecha_cambio: '2026-01-01T00:00:00Z', usuario: 'admin', motivo: 'Precio inicial' },
  { id: 2, producto_id: 'tostado-mixto', precio_anterior: 0, precio_nuevo: 3500, fecha_cambio: '2026-01-01T00:00:00Z', usuario: 'admin', motivo: 'Precio inicial' },
];

const mockComandas: Array<any> = [];
const mockCuentas: Array<any> = [];

interface MockTurno {
  id: number;
  codigo_visible: string;
  operador_apertura: string;
  fondo_inicial: number;
  fecha_apertura: string;
  estado: 'Abierto' | 'Cerrado';
  operador_cierre: string | null;
  fecha_cierre: string | null;
  observaciones_cierre: string | null;
}

interface MockRetiro {
  id: number;
  turno_id: number;
  monto: number;
  operador: string;
  receptor: string;
  motivo: string;
  creado_en: string;
}

interface MockArqueo {
  id: number;
  turno_id: number;
  esperado_efectivo: number;
  declarado_efectivo: number;
  diferencia_efectivo: number;
  esperado_debito: number;
  declarado_debito: number;
  diferencia_debito: number;
  esperado_credito: number;
  declarado_credito: number;
  diferencia_credito: number;
  esperado_transferencia: number;
  declarado_transferencia: number;
  diferencia_transferencia: number;
  diferencia_total: number;
  justificacion: string | null;
  creado_en: string;
}

const mockTurnos: Array<MockTurno> = [];
const mockRetiros: Array<MockRetiro> = [];
const mockArqueos: Array<MockArqueo> = [];

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

      const turnoActivo = mockTurnos.find((t) => t.estado === 'Abierto');
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
        turno_id: turnoActivo ? turnoActivo.id : null,
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
            if (p.medio_pago === 'Tarjeta Débito') debito += p.monto;
            if (p.medio_pago === 'Tarjeta Crédito') credito += p.monto;
            if (p.medio_pago === 'Transferencia') transf += p.monto;
          } else {
            anurados++;
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

    case 'listar_productos': {
      const payload = args.payload || {};
      let list = [...mockProductos];
      if (payload.solo_disponibles) {
        list = list.filter((p) => p.disponible_para_venta && p.activo);
      }
      if (payload.categoria) {
        list = list.filter((p) => p.categoria.toLowerCase() === payload.categoria.toLowerCase());
      }
      return list as T;
    }

    case 'crear_producto': {
      const payload = args.payload;
      if (!payload.nombre || !payload.nombre.trim()) throw new Error('El nombre del producto no puede estar vacío');
      if (payload.precio <= 0) throw new Error('El precio debe ser estrictamente positivo');
      const id = payload.nombre.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const nuevo = {
        id,
        nombre: payload.nombre.trim(),
        categoria: payload.categoria.trim(),
        precio_actual: Math.round(payload.precio * 100) / 100,
        disponible_para_venta: true,
        descripcion: payload.descripcion || null,
        activo: true,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
      };
      mockProductos.push(nuevo);
      mockHistorialPrecios.push({
        id: mockHistorialPrecios.length + 1,
        producto_id: id,
        precio_anterior: 0,
        precio_nuevo: nuevo.precio_actual,
        fecha_cambio: nuevo.creado_en,
        usuario: payload.operador || 'admin',
        motivo: 'Precio inicial de alta',
      });
      return nuevo as T;
    }

    case 'actualizar_producto': {
      const payload = args.payload;
      const prod = mockProductos.find((p) => p.id === payload.id);
      if (!prod) throw new Error('Producto no encontrado');
      if (!payload.nombre || !payload.nombre.trim()) throw new Error('El nombre del producto no puede estar vacío');
      prod.nombre = payload.nombre.trim();
      prod.categoria = payload.categoria.trim();
      prod.descripcion = payload.descripcion || null;
      prod.actualizado_en = new Date().toISOString();
      return prod as T;
    }

    case 'actualizar_precio_producto': {
      const payload = args.payload;
      const prod = mockProductos.find((p) => p.id === payload.producto_id);
      if (!prod) throw new Error('Producto no encontrado');
      if (payload.nuevo_precio <= 0) throw new Error('El precio debe ser estrictamente positivo');
      const precioAnterior = prod.precio_actual;
      prod.precio_actual = Math.round(payload.nuevo_precio * 100) / 100;
      prod.actualizado_en = new Date().toISOString();
      mockHistorialPrecios.push({
        id: mockHistorialPrecios.length + 1,
        producto_id: prod.id,
        precio_anterior: precioAnterior,
        precio_nuevo: prod.precio_actual,
        fecha_cambio: prod.actualizado_en,
        usuario: payload.operador || 'admin',
        motivo: payload.motivo || 'Ajuste de precio',
      });
      return prod as T;
    }

    case 'cambiar_disponibilidad_producto': {
      const payload = args.payload;
      const prod = mockProductos.find((p) => p.id === payload.producto_id);
      if (!prod) throw new Error('Producto no encontrado');
      prod.disponible_para_venta = payload.disponible;
      prod.actualizado_en = new Date().toISOString();
      return prod as T;
    }

    case 'dar_baja_producto': {
      const payload = args.payload;
      const prod = mockProductos.find((p) => p.id === payload.producto_id);
      if (!prod) throw new Error('Producto no encontrado');
      prod.activo = false;
      prod.disponible_para_venta = false;
      prod.actualizado_en = new Date().toISOString();
      return prod as T;
    }

    case 'obtener_historial_precios': {
      const payload = args.payload;
      const historial = mockHistorialPrecios
        .filter((h) => h.producto_id === payload.producto_id)
        .sort((a, b) => b.id - a.id);
      return historial as T;
    }

    case 'listar_categorias': {
      const payload = args.payload || {};
      return (payload.solo_activas ? mockCategorias.filter((c) => c.activo) : mockCategorias) as T;
    }

    case 'guardar_categoria': {
      const payload = args.payload;
      const idx = mockCategorias.findIndex((c) => c.id === payload.id);
      if (idx >= 0) {
        mockCategorias[idx] = { ...payload };
        return mockCategorias[idx] as T;
      } else {
        mockCategorias.push({ ...payload });
        return payload as T;
      }
    }

    // Comandos Feature 004: Gestión de Turnos de Caja y Arqueo Ciego
    case 'obtener_estado_turno_actual': {
      const turno = mockTurnos.find((t) => t.estado === 'Abierto') || null;
      const cuentasPendientes = mockCuentas.filter((c) => c.estado === 'Abierta').length;

      if (!turno) {
        return {
          turno_abierto: null,
          efectivo_en_gaveta: 0,
          total_cobrado_efectivo: 0,
          total_cobrado_debito: 0,
          total_cobrado_credito: 0,
          total_cobrado_transferencia: 0,
          total_recaudado: 0,
          total_retiros: 0,
          cantidad_cobros: 0,
          cantidad_retiros: 0,
          cuentas_abiertas_pendientes: cuentasPendientes,
        } as T;
      }

      let cobrosEf = 0;
      let cobrosDeb = 0;
      let cobrosCre = 0;
      let cobrosTra = 0;
      let cantCobros = 0;

      for (const cu of mockCuentas) {
        for (const p of cu.pagos || []) {
          if (p.estado === 'Activo' && (p.turno_id === turno.id || (!p.turno_id && turno.estado === 'Abierto'))) {
            cantCobros++;
            if (p.medio_pago === 'Efectivo') cobrosEf += p.monto;
            else if (p.medio_pago === 'Tarjeta Débito' || p.medio_pago === 'TarjetaDebito') cobrosDeb += p.monto;
            else if (p.medio_pago === 'Tarjeta Crédito' || p.medio_pago === 'TarjetaCredito') cobrosCre += p.monto;
            else if (p.medio_pago === 'Transferencia') cobrosTra += p.monto;
          }
        }
      }

      const retirosTurno = mockRetiros.filter((r) => r.turno_id === turno.id);
      const totalRetiros = retirosTurno.reduce((acc, r) => acc + r.monto, 0);
      const efectivoGaveta = Math.round((turno.fondo_inicial + cobrosEf - totalRetiros) * 100) / 100;
      const totalRecaudado = Math.round((cobrosEf + cobrosDeb + cobrosCre + cobrosTra) * 100) / 100;

      return {
        turno_abierto: turno,
        efectivo_en_gaveta: efectivoGaveta,
        total_cobrado_efectivo: Math.round(cobrosEf * 100) / 100,
        total_cobrado_debito: Math.round(cobrosDeb * 100) / 100,
        total_cobrado_credito: Math.round(cobrosCre * 100) / 100,
        total_cobrado_transferencia: Math.round(cobrosTra * 100) / 100,
        total_recaudado: totalRecaudado,
        total_retiros: Math.round(totalRetiros * 100) / 100,
        cantidad_cobros: cantCobros,
        cantidad_retiros: retirosTurno.length,
        cuentas_abiertas_pendientes: cuentasPendientes,
      } as T;
    }

    case 'abrir_turno_caja': {
      const payload = args.payload;
      const abiertoExistente = mockTurnos.find((t) => t.estado === 'Abierto');
      if (abiertoExistente) {
        throw new Error('Ya existe un turno de caja abierto en la terminal. Debe cerrarse antes de iniciar uno nuevo.');
      }
      if (payload.fondo_inicial < 0) {
        throw new Error('El fondo inicial de caja no puede ser negativo.');
      }
      if (!payload.operador || !payload.operador.trim()) {
        throw new Error('El operador de apertura es obligatorio.');
      }

      const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const countHoy = mockTurnos.filter((t) => t.fecha_apertura.startsWith(new Date().toISOString().slice(0, 10))).length;
      const codigo = `TUR-${hoy}-${String(countHoy + 1).padStart(4, '0')}`;
      const nuevoTurno: MockTurno = {
        id: mockTurnos.length + 1,
        codigo_visible: codigo,
        operador_apertura: payload.operador.trim(),
        fondo_inicial: Math.round(payload.fondo_inicial * 100) / 100,
        fecha_apertura: new Date().toISOString(),
        estado: 'Abierto',
        operador_cierre: null,
        fecha_cierre: null,
        observaciones_cierre: null,
      };
      mockTurnos.push(nuevoTurno);
      return nuevoTurno as T;
    }

    case 'registrar_retiro_caja': {
      const payload = args.payload;
      const turno = mockTurnos.find((t) => t.estado === 'Abierto');
      if (!turno) {
        throw new Error('No existe un turno de caja abierto para registrar la operación.');
      }
      if (payload.monto <= 0) {
        throw new Error('El monto debe ser un importe positivo mayor a cero.');
      }
      if (!payload.operador?.trim() || !payload.receptor?.trim()) {
        throw new Error('Operador y receptor son obligatorios.');
      }
      if (!payload.motivo || payload.motivo.trim().length < 4) {
        throw new Error('Debe ingresar obligatoriamente un motivo justificado (mínimo 4 caracteres).');
      }

      let cobrosEf = 0;
      for (const cu of mockCuentas) {
        for (const p of cu.pagos || []) {
          if (p.estado === 'Activo' && (p.turno_id === turno.id || (!p.turno_id && turno.estado === 'Abierto'))) {
            if (p.medio_pago === 'Efectivo') cobrosEf += p.monto;
          }
        }
      }
      const retirosPrevios = mockRetiros
        .filter((r) => r.turno_id === turno.id)
        .reduce((acc, r) => acc + r.monto, 0);
      const disponible = turno.fondo_inicial + cobrosEf - retirosPrevios;

      if (payload.monto > disponible + 0.01) {
        throw new Error('El monto solicitado supera el efectivo actualmente disponible en la gaveta.');
      }

      const nuevoRetiro: MockRetiro = {
        id: mockRetiros.length + 1,
        turno_id: turno.id,
        monto: Math.round(payload.monto * 100) / 100,
        operador: payload.operador.trim(),
        receptor: payload.receptor.trim(),
        motivo: payload.motivo.trim(),
        creado_en: new Date().toISOString(),
      };
      mockRetiros.push(nuevoRetiro);
      return nuevoRetiro as T;
    }

    case 'cerrar_turno_arqueo_ciego': {
      const payload = args.payload;
      const turno = mockTurnos.find((t) => t.estado === 'Abierto');
      if (!turno) {
        throw new Error('No existe un turno de caja abierto para cerrar.');
      }

      let cobrosEf = 0;
      let cobrosDeb = 0;
      let cobrosCre = 0;
      let cobrosTra = 0;

      for (const cu of mockCuentas) {
        for (const p of cu.pagos || []) {
          if (p.estado === 'Activo' && (p.turno_id === turno.id || (!p.turno_id && turno.estado === 'Abierto'))) {
            if (p.medio_pago === 'Efectivo') cobrosEf += p.monto;
            else if (p.medio_pago === 'Tarjeta Débito' || p.medio_pago === 'TarjetaDebito') cobrosDeb += p.monto;
            else if (p.medio_pago === 'Tarjeta Crédito' || p.medio_pago === 'TarjetaCredito') cobrosCre += p.monto;
            else if (p.medio_pago === 'Transferencia') cobrosTra += p.monto;
          }
        }
      }

      const retiros = mockRetiros.filter((r) => r.turno_id === turno.id);
      const totalRetiros = retiros.reduce((acc, r) => acc + r.monto, 0);
      const esperadoEf = Math.round((turno.fondo_inicial + cobrosEf - totalRetiros) * 100) / 100;
      const declaradoEf = Math.round((payload.declarado_efectivo || 0) * 100) / 100;
      const difEf = Math.round((declaradoEf - esperadoEf) * 100) / 100;

      const esperadoDeb = Math.round(cobrosDeb * 100) / 100;
      const declaradoDeb = Math.round((payload.declarado_debito || 0) * 100) / 100;
      const difDeb = Math.round((declaradoDeb - esperadoDeb) * 100) / 100;

      const esperadoCre = Math.round(cobrosCre * 100) / 100;
      const declaradoCre = Math.round((payload.declarado_credito || 0) * 100) / 100;
      const difCre = Math.round((declaradoCre - esperadoCre) * 100) / 100;

      const esperadoTra = Math.round(cobrosTra * 100) / 100;
      const declaradoTra = Math.round((payload.declarado_transferencia || 0) * 100) / 100;
      const difTra = Math.round((declaradoTra - esperadoTra) * 100) / 100;

      const difTotal = Math.round((difEf + difDeb + difCre + difTra) * 100) / 100;

      if (Math.abs(difEf) > 1000 && (!payload.justificacion || !payload.justificacion.trim())) {
        throw new Error('Debe ingresar obligatoriamente una justificación por discrepancia de caja superior a $1.000.');
      }

      const timestamp = new Date().toISOString();
      turno.estado = 'Cerrado';
      turno.operador_cierre = payload.operador || 'Cajero';
      turno.fecha_cierre = timestamp;
      turno.observaciones_cierre = payload.observaciones || null;

      const nuevoArqueo: MockArqueo = {
        id: mockArqueos.length + 1,
        turno_id: turno.id,
        esperado_efectivo: esperadoEf,
        declarado_efectivo: declaradoEf,
        diferencia_efectivo: difEf,
        esperado_debito: esperadoDeb,
        declarado_debito: declaradoDeb,
        diferencia_debito: difDeb,
        esperado_credito: esperadoCre,
        declarado_credito: declaradoCre,
        diferencia_credito: difCre,
        esperado_transferencia: esperadoTra,
        declarado_transferencia: declaradoTra,
        diferencia_transferencia: difTra,
        diferencia_total: difTotal,
        justificacion: payload.justificacion?.trim() || null,
        creado_en: timestamp,
      };
      mockArqueos.push(nuevoArqueo);

      const detalleCompleto = {
        turno: { ...turno },
        arqueo: nuevoArqueo,
        retiros: [...retiros],
        resumen_medios_pago: {
          efectivo: cobrosEf,
          debito: cobrosDeb,
          credito: cobrosCre,
          transferencia: cobrosTra,
          total: Math.round((cobrosEf + cobrosDeb + cobrosCre + cobrosTra) * 100) / 100,
        },
      };

      return detalleCompleto as T;
    }

    case 'listar_historial_turnos': {
      return [...mockTurnos].reverse() as T;
    }

    case 'obtener_detalle_turno': {
      const payload = args.payload;
      const turno = mockTurnos.find((t) => t.id === payload.turno_id);
      if (!turno) throw new Error('Turno no encontrado');

      const arqueo = mockArqueos.find((a) => a.turno_id === turno.id) || null;
      const retiros = mockRetiros.filter((r) => r.turno_id === turno.id);

      let cobrosEf = 0;
      let cobrosDeb = 0;
      let cobrosCre = 0;
      let cobrosTra = 0;

      for (const cu of mockCuentas) {
        for (const p of cu.pagos || []) {
          if (p.estado === 'Activo' && (p.turno_id === turno.id || (!p.turno_id && turno.estado === 'Abierto'))) {
            if (p.medio_pago === 'Efectivo') cobrosEf += p.monto;
            else if (p.medio_pago === 'Tarjeta Débito' || p.medio_pago === 'TarjetaDebito') cobrosDeb += p.monto;
            else if (p.medio_pago === 'Tarjeta Crédito' || p.medio_pago === 'TarjetaCredito') cobrosCre += p.monto;
            else if (p.medio_pago === 'Transferencia') cobrosTra += p.monto;
          }
        }
      }

      return {
        turno: { ...turno },
        arqueo,
        retiros,
        resumen_medios_pago: {
          efectivo: Math.round(cobrosEf * 100) / 100,
          debito: Math.round(cobrosDeb * 100) / 100,
          credito: Math.round(cobrosCre * 100) / 100,
          transferencia: Math.round(cobrosTra * 100) / 100,
          total: Math.round((cobrosEf + cobrosDeb + cobrosCre + cobrosTra) * 100) / 100,
        },
      } as T;
    }

    case 'generar_comprobante_impresion_turno': {
      const payload = args.payload;
      const turno = mockTurnos.find((t) => t.id === payload.turno_id);
      if (!turno) throw new Error('Turno no encontrado');
      const arqueo = mockArqueos.find((a) => a.turno_id === turno.id);
      const retiros = mockRetiros.filter((r) => r.turno_id === turno.id);

      let cobrosEf = 0;
      let cobrosDeb = 0;
      let cobrosCre = 0;
      let cobrosTra = 0;
      for (const cu of mockCuentas) {
        for (const p of cu.pagos || []) {
          if (p.estado === 'Activo' && (p.turno_id === turno.id || (!p.turno_id && turno.estado === 'Abierto'))) {
            if (p.medio_pago === 'Efectivo') cobrosEf += p.monto;
            else if (p.medio_pago === 'Tarjeta Débito' || p.medio_pago === 'TarjetaDebito') cobrosDeb += p.monto;
            else if (p.medio_pago === 'Tarjeta Crédito' || p.medio_pago === 'TarjetaCredito') cobrosCre += p.monto;
            else if (p.medio_pago === 'Transferencia') cobrosTra += p.monto;
          }
        }
      }
      const totalCobrado = cobrosEf + cobrosDeb + cobrosCre + cobrosTra;
      const totalRetiros = retiros.reduce((acc, r) => acc + r.monto, 0);

      const sep = '='.repeat(48);
      const sepS = '-'.repeat(48);
      let s = `${sep}\n          BALNEARIO - CIERRE DE TURNO           \n${sep}\n`;
      s += `Turno: ${turno.codigo_visible.padEnd(18)} Estado: ${turno.estado.toUpperCase().padEnd(10)}\n`;
      s += `Cajero Apertura: ${turno.operador_apertura}\n`;
      s += `Inicio: ${turno.fecha_apertura}\n`;
      if (turno.fecha_cierre) s += `Cierre: ${turno.fecha_cierre}\n`;
      if (turno.operador_cierre) s += `Cajero Cierre:   ${turno.operador_cierre}\n`;
      s += `${sepS}\nRECAUDACIÓN POR MEDIO DE COBRO:\n`;
      s += `  Efectivo:                   $${cobrosEf.toFixed(2).padStart(14)}\n`;
      s += `  Tarjeta Débito:             $${cobrosDeb.toFixed(2).padStart(14)}\n`;
      s += `  Tarjeta Crédito:            $${cobrosCre.toFixed(2).padStart(14)}\n`;
      s += `  Transferencia / QR:         $${cobrosTra.toFixed(2).padStart(14)}\n`;
      s += `${sepS}\nTOTAL COBRADO EN TURNO:       $${totalCobrado.toFixed(2).padStart(14)}\n${sepS}\n`;
      s += `MOVIMIENTO DE EFECTIVO EN GAVETA:\n`;
      s += `  (+) Fondo Inicial:          $${turno.fondo_inicial.toFixed(2).padStart(14)}\n`;
      s += `  (+) Cobros en Efectivo:     $${cobrosEf.toFixed(2).padStart(14)}\n`;
      s += `  (-) Retiros / Sangrías (${retiros.length}): -$${totalRetiros.toFixed(2).padStart(13)}\n`;

      if (arqueo) {
        s += `${sepS}\n`;
        s += `EFECTIVO TEÓRICO ESPERADO:    $${arqueo.esperado_efectivo.toFixed(2).padStart(14)}\n`;
        s += `EFECTIVO REAL DECLARADO:      $${arqueo.declarado_efectivo.toFixed(2).padStart(14)}\n`;
        s += `${sepS}\n`;
        const resStr = arqueo.diferencia_efectivo === 0 ? 'EXACTO (0.00)' : arqueo.diferencia_efectivo > 0 ? 'SOBRANTE (+)' : 'FALTANTE (-)';
        s += `RESULTADO ARQUEO EFECTIVO:    $${arqueo.diferencia_efectivo.toFixed(2).padStart(14)} (${resStr})\n`;
        if (arqueo.justificacion) {
          s += `Justificación: ${arqueo.justificacion}\n`;
        }
      }
      s += `${sep}\n\nFirma Cajero:    ___________________________\n\nFirma Supervisor: ___________________________\n${sep}\n`;
      return s as T;
    }

    default:
      throw new Error(`Comando no reconocido: ${cmd}`);
  }
}
