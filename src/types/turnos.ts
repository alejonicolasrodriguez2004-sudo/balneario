// src/types/turnos.ts
// Tipos TypeScript para Gestión de Turnos de Caja, Arqueo Ciego y Sangrías (Feature 004)

export type EstadoTurno = 'Abierto' | 'Cerrado';

export interface TurnoCajaDto {
  id: number;
  codigo_visible: string;
  operador_apertura: string;
  fondo_inicial: number;
  fecha_apertura: string;
  estado: EstadoTurno;
  operador_cierre?: string | null;
  fecha_cierre?: string | null;
  observaciones_cierre?: string | null;
}

export interface RetiroCajaDto {
  id: number;
  turno_id: number;
  monto: number;
  operador: string;
  receptor: string;
  motivo: string;
  creado_en: string;
}

export interface ArqueoCierreDto {
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
  justificacion?: string | null;
  creado_en: string;
}

export interface EstadoTurnoActualDto {
  turno_abierto: TurnoCajaDto | null;
  efectivo_en_gaveta: number;
  total_cobrado_efectivo: number;
  total_cobrado_debito: number;
  total_cobrado_credito: number;
  total_cobrado_transferencia: number;
  total_recaudado: number;
  total_retiros: number;
  cantidad_cobros: number;
  cantidad_retiros: number;
  cuentas_abiertas_pendientes: number;
}

export interface DetalleTurnoCompletoDto {
  turno: TurnoCajaDto;
  arqueo?: ArqueoCierreDto | null;
  retiros: RetiroCajaDto[];
  resumen_medios_pago: {
    efectivo: number;
    debito: number;
    credito: number;
    transferencia: number;
    total: number;
  };
}

// Request Payloads
export interface AbrirTurnoPayload {
  operador: string;
  fondo_inicial: number;
}

export interface RegistrarRetiroPayload {
  monto: number;
  operador: string;
  receptor: string;
  motivo: string;
}

export interface CerrarTurnoArqueoCiegoPayload {
  declarado_efectivo: number;
  declarado_debito?: number;
  declarado_credito?: number;
  declarado_transferencia?: number;
  justificacion?: string | null;
  operador: string;
}

export interface ListarTurnosPayload {
  filtro_estado?: EstadoTurno | 'Todos';
  limite?: number;
}
