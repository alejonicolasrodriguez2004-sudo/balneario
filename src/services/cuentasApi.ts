// src/services/cuentasApi.ts
// Servicio frontend para operaciones de Cuentas, Pagos y Caja (Feature 002)

import { invokeCommand } from './apiClient';
import {
  CuentaDto,
  CuentaDetalladaDto,
  PagoDto,
  RegistrarPagoRequest,
  RegistrarPagoResponse,
  ResumenArqueoDto,
} from '../types/cuentas';

export const cuentasApi = {
  /**
   * Abre una cuenta consolidando las comandas activas de una ubicación
   */
  async abrirCuenta(ubicacionId: string, operador: string): Promise<CuentaDetalladaDto> {
    return invokeCommand<CuentaDetalladaDto>('abrir_cuenta', {
      payload: { ubicacion_id: ubicacionId, operador },
    });
  },

  /**
   * Obtiene el detalle completo de una cuenta con comandas y pagos
   */
  async obtenerCuenta(cuentaId: number): Promise<CuentaDetalladaDto> {
    return invokeCommand<CuentaDetalladaDto>('obtener_cuenta', {
      payload: { cuenta_id: cuentaId },
    });
  },

  /**
   * Lista todas las cuentas abiertas y pagadas actualmente en el balneario
   */
  async listarCuentasActivas(): Promise<CuentaDto[]> {
    return invokeCommand<CuentaDto[]>('listar_cuentas_activas', {});
  },

  /**
   * Registra un pago transaccional con medio de pago y deducción de saldo
   */
  async registrarPago(request: RegistrarPagoRequest): Promise<RegistrarPagoResponse> {
    return invokeCommand<RegistrarPagoResponse>('registrar_pago', {
      payload: request,
    });
  },

  /**
   * Cierra definitivamente una cuenta pagada y libera la ubicación física
   */
  async cerrarCuentaYLiberar(cuentaId: number, operador: string): Promise<CuentaDto> {
    return invokeCommand<CuentaDto>('cerrar_cuenta_y_liberar', {
      payload: { cuenta_id: cuentaId, operador },
    });
  },

  /**
   * Anula un pago registrado erróneamente con motivo justificado obligatorio
   */
  async anularPago(
    cuentaId: number,
    pagoId: number,
    motivo: string,
    operador: string
  ): Promise<CuentaDetalladaDto> {
    return invokeCommand<CuentaDetalladaDto>('anular_pago', {
      payload: { cuenta_id: cuentaId, pago_id: pagoId, motivo, operador },
    });
  },

  /**
   * Anula una cuenta abierta por error (sin cobros activos)
   */
  async anularCuenta(
    cuentaId: number,
    motivo: string,
    operador: string
  ): Promise<CuentaDto> {
    return invokeCommand<CuentaDto>('anular_cuenta', {
      payload: { cuenta_id: cuentaId, motivo, operador },
    });
  },

  /**
   * Obtiene el resumen consolidado de arqueo de caja del turno
   */
  async obtenerResumenArqueo(): Promise<ResumenArqueoDto> {
    return invokeCommand<ResumenArqueoDto>('obtener_resumen_arqueo', {});
  },

  /**
   * Algoritmo del lado cliente para proyectar división en partes iguales
   * con absorción de redondeo en la última cuota (coincidente con el core de Rust)
   */
  calcularDivision(saldo: number, partes: number): number[] {
    if (partes < 2 || saldo <= 0) return [saldo];
    const baseCents = Math.floor((saldo / partes) * 100);
    const cuotas: number[] = [];
    let acumuladoCents = 0;

    for (let i = 0; i < partes; i++) {
      if (i === partes - 1) {
        const totalCents = Math.round(saldo * 100);
        cuotas.push((totalCents - acumuladoCents) / 100);
      } else {
        cuotas.push(baseCents / 100);
        acumuladoCents += baseCents;
      }
    }
    return cuotas;
  },
};

