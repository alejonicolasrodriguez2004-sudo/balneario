// src/services/turnosApi.ts
// Cliente de servicio frontend para Gestión de Turnos de Caja, Arqueo Ciego y Sangrías (Feature 004)

import { invokeCommand } from './apiClient';
import {
  TurnoCajaDto,
  RetiroCajaDto,
  EstadoTurnoActualDto,
  DetalleTurnoCompletoDto,
  AbrirTurnoPayload,
  RegistrarRetiroPayload,
  CerrarTurnoArqueoCiegoPayload,
  ListarTurnosPayload,
} from '../types/turnos';

export const turnosApi = {
  /**
   * Obtiene el estado operacional del turno actual (si hay turno abierto, saldos y cuentas pendientes)
   */
  async obtenerEstadoTurnoActual(): Promise<EstadoTurnoActualDto> {
    return invokeCommand<EstadoTurnoActualDto>('obtener_estado_turno_actual');
  },

  /**
   * Abre un nuevo turno de caja con fondo inicial en efectivo
   */
  async abrirTurno(payload: AbrirTurnoPayload): Promise<TurnoCajaDto> {
    return invokeCommand<TurnoCajaDto>('abrir_turno_caja', { payload });
  },

  /**
   * Registra una sangría parcial de efectivo desde la gaveta
   */
  async registrarRetiro(payload: RegistrarRetiroPayload): Promise<RetiroCajaDto> {
    return invokeCommand<RetiroCajaDto>('registrar_retiro_caja', { payload });
  },

  /**
   * Ejecuta el cierre de turno mediante arqueo ciego, calculando diferencias y sellando el turno
   */
  async cerrarTurnoArqueoCiego(payload: CerrarTurnoArqueoCiegoPayload): Promise<DetalleTurnoCompletoDto> {
    return invokeCommand<DetalleTurnoCompletoDto>('cerrar_turno_arqueo_ciego', { payload });
  },

  /**
   * Obtiene el historial de turnos pasados
   */
  async listarHistorialTurnos(payload?: ListarTurnosPayload): Promise<TurnoCajaDto[]> {
    return invokeCommand<TurnoCajaDto[]>('listar_historial_turnos', { payload: payload || {} });
  },

  /**
   * Obtiene el detalle consolidado de un turno cerrado o abierto
   */
  async obtenerDetalleTurno(turnoId: number): Promise<DetalleTurnoCompletoDto> {
    return invokeCommand<DetalleTurnoCompletoDto>('obtener_detalle_turno', { payload: { turno_id: turnoId } });
  },

  /**
   * Genera el texto formateado monospaciado de liquidación para ticket térmico de 80mm
   */
  async generarComprobante(turnoId: number): Promise<string> {
    return invokeCommand<string>('generar_comprobante_impresion_turno', { payload: { turno_id: turnoId } });
  },
};
