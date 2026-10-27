// src/types/cuentas.ts
// Tipos TypeScript para Cuentas, Pagos y Arqueo de Caja (Feature 002)

export type EstadoCuenta = 'Abierta' | 'Pagada' | 'Cerrada' | 'Anulada';

export type MedioPago = 'Efectivo' | 'Tarjeta Débito' | 'Tarjeta Crédito' | 'Transferencia';

export type EstadoPago = 'Activo' | 'Cancelado';

export interface PagoDto {
  id: number;
  cuenta_id: number;
  medio_pago: MedioPago;
  monto: number;
  monto_entregado?: number | null;
  vuelto?: number | null;
  referencia_externa?: string | null;
  estado: EstadoPago;
  motivo_anulacion?: string | null;
  cancelado_por?: string | null;
  cancelado_en?: string | null;
  creado_por: string;
  creado_en: string;
}

export interface ComandaEnCuentaDto {
  comanda_id: number;
  codigo_visible: string;
  total: number;
}

export interface CuentaDto {
  id: number;
  codigo_visible: string;
  ubicacion_id: string;
  ubicacion_nombre: string;
  estado: EstadoCuenta;
  total: number;
  saldo_pendiente: number;
  creado_por: string;
  creado_en: string;
  cerrado_en?: string | null;
  anulado_en?: string | null;
  motivo_anulacion?: string | null;
  anulado_por?: string | null;
}

export interface CuentaDetalladaDto extends CuentaDto {
  comandas_asociadas: ComandaEnCuentaDto[];
  pagos: PagoDto[];
}

export interface ResumenArqueoDto {
  total_efectivo: number;
  total_debito: number;
  total_credito: number;
  total_transferencia: number;
  total_recaudado: number;
  cantidad_pagos_activos: number;
  cantidad_pagos_anulados: number;
}

export interface DivisionItemDto {
  numero_cuota: number;
  monto_sugerido: number;
  pagado: boolean;
}

export interface DivisionCuentaDto {
  cantidad_partes: number;
  cuotas: DivisionItemDto[];
}

export interface RegistrarPagoRequest {
  cuenta_id: number;
  medio_pago: MedioPago;
  monto: number;
  monto_entregado?: number | null;
  referencia_externa?: string | null;
  operador: string;
  token_idempotencia: string;
}

export interface RegistrarPagoResponse {
  cuenta_actualizada: CuentaDto;
  pago_registrado: PagoDto;
  vuelto_a_entregar?: number | null;
}

