// src/components/TurnosView.tsx
// Vista principal de Gestión de Turnos de Caja, Arqueo Ciego, Sangrías e Historial (Feature 004)

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  ArrowUpRight,
  Receipt,
  DollarSign,
  Clock,
  User,
  AlertTriangle,
  History,
  CheckCircle2,
  RefreshCw,
  Plus,
  CreditCard,
  QrCode,
  Banknote,
  Eye,
} from 'lucide-react';
import {
  EstadoTurnoActualDto,
  TurnoCajaDto,
  RetiroCajaDto,
  DetalleTurnoCompletoDto,
} from '../types/turnos';
import { turnosApi } from '../services/turnosApi';
import { AperturaTurnoModal } from './AperturaTurnoModal';
import { ArqueoCiegoModal } from './ArqueoCiegoModal';
import { RetiroModal } from './RetiroModal';
import { ComprobanteTurnoModal } from './ComprobanteTurnoModal';

interface TurnosViewProps {
  operadorActual: string;
}

export const TurnosView: React.FC<TurnosViewProps> = ({ operadorActual }) => {
  const [estadoActual, setEstadoActual] = useState<EstadoTurnoActualDto | null>(null);
  const [historial, setHistorial] = useState<TurnoCajaDto[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [tabActiva, setTabActiva] = useState<'actual' | 'historial'>('actual');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modales
  const [mostrarAperturaModal, setMostrarAperturaModal] = useState<boolean>(false);
  const [mostrarArqueoModal, setMostrarArqueoModal] = useState<boolean>(false);
  const [mostrarRetiroModal, setMostrarRetiroModal] = useState<boolean>(false);
  const [comprobanteTurnoId, setComprobanteTurnoId] = useState<number | null>(null);

  const cargarDatos = useCallback(async () => {
    try {
      setCargando(true);
      setErrorMsg(null);
      const [estado, hist] = await Promise.all([
        turnosApi.obtenerEstadoTurnoActual(),
        turnosApi.listarHistorialTurnos(),
      ]);
      setEstadoActual(estado);
      setHistorial(hist);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || 'Error al cargar información de turnos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleTurnoAbierto = (turno: TurnoCajaDto) => {
    setMostrarAperturaModal(false);
    cargarDatos();
  };

  const handleTurnoCerrado = (detalle: DetalleTurnoCompletoDto) => {
    setMostrarArqueoModal(false);
    setComprobanteTurnoId(detalle.turno.id);
    cargarDatos();
  };

  const handleRetiroRegistrado = (_retiro: RetiroCajaDto) => {
    setMostrarRetiroModal(false);
    cargarDatos();
  };

  const turno = estadoActual?.turno_abierto;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Barra Superior */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-100">Control de Caja y Turnos</h1>
            {turno ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Turno Abierto
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                Sin Turno Activo
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestión de apertura de caja, gaveta en efectivo, sangrías y arqueo ciego inmutable
          </p>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={cargarDatos}
            disabled={cargando}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Refrescar estado"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>

          {!turno ? (
            <button
              onClick={() => setMostrarAperturaModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-900/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              Abrir Turno de Caja
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMostrarRetiroModal(true)}
                className="px-3.5 py-2 rounded-xl bg-orange-600/90 hover:bg-orange-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-900/20 transition-all"
              >
                <ArrowUpRight className="w-4 h-4" />
                Registrar Sangría
              </button>
              <button
                onClick={() => setMostrarArqueoModal(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-900/20 transition-all"
              >
                <Lock className="w-4 h-4" />
                Cerrar Turno (Arqueo)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-6">
        <div className="flex gap-4">
          <button
            onClick={() => setTabActiva('actual')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              tabActiva === 'actual'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Turno Actual y Gaveta
          </button>
          <button
            onClick={() => setTabActiva('historial')}
            className={`py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              tabActiva === 'historial'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            Historial de Turnos ({historial.length})
          </button>
        </div>
      </div>

      {/* Mensajes de error si los hay */}
      {errorMsg && (
        <div className="m-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Contenido Principal */}
      <div className="p-6 space-y-6 flex-1">
        {tabActiva === 'actual' ? (
          turno ? (
            /* Turno Abierto */
            <div className="space-y-6">
              {/* Tarjetas Principales de Métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Efectivo en Gaveta */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-1">
                    <span>Efectivo en Gaveta</span>
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div className="text-3xl font-black text-emerald-300">
                    ${(estadoActual?.efectivo_en_gaveta ?? 0).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Fondo (${turno.fondo_inicial.toLocaleString()}) + Cobros - Retiros
                  </p>
                </div>

                {/* 2. Total Cobrado en Turno */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1">
                    <span>Total Cobrado</span>
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="text-3xl font-black text-sky-300">
                    ${(estadoActual?.total_recaudado ?? 0).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {estadoActual?.cantidad_cobros ?? 0} pagos imputados
                  </p>
                </div>

                {/* 3. Retiros / Sangrías */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-orange-400 mb-1">
                    <span>Sangrías Realizadas</span>
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div className="text-3xl font-black text-orange-300">
                    ${(estadoActual?.total_retiros ?? 0).toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {estadoActual?.cantidad_retiros ?? 0} retiros hacia caja fuerte
                  </p>
                </div>

                {/* 4. Cuentas Pendientes */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">
                    <span>Cuentas Abiertas</span>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="text-3xl font-black text-amber-300">
                    {estadoActual?.cuentas_abiertas_pendientes ?? 0}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {estadoActual?.cuentas_abiertas_pendientes === 0
                      ? 'Sin mesas ni carpas pendientes'
                      : 'Atención al cerrar turno'}
                  </p>
                </div>
              </div>

              {/* Fila Detalle Turno y Desglose de Medios */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Info Turno */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Datos del Turno
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Código de Turno:</span>
                      <span className="font-mono font-semibold text-slate-100">{turno.codigo_visible}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Cajero Apertura:</span>
                      <span className="font-semibold text-slate-100">{turno.operador_apertura}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Fondo Inicial:</span>
                      <span className="font-semibold text-emerald-400">${turno.fondo_inicial.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-800">
                      <span className="text-slate-400">Fecha y Hora Apertura:</span>
                      <span className="font-mono text-slate-300">{new Date(turno.fecha_apertura).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-400">Estado:</span>
                      <span className="text-emerald-400 font-semibold uppercase">Activo</span>
                    </div>
                  </div>
                </div>

                {/* Desglose Medios de Pago */}
                <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Recaudación Imputada por Medio de Cobro
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 mb-1">
                        <Banknote className="w-4 h-4" />
                        <span>Efectivo</span>
                      </div>
                      <div className="text-lg font-bold text-slate-100">
                        ${(estadoActual?.total_cobrado_efectivo ?? 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 mb-1">
                        <CreditCard className="w-4 h-4" />
                        <span>Débito</span>
                      </div>
                      <div className="text-lg font-bold text-slate-100">
                        ${(estadoActual?.total_cobrado_debito ?? 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 mb-1">
                        <CreditCard className="w-4 h-4" />
                        <span>Crédito</span>
                      </div>
                      <div className="text-lg font-bold text-slate-100">
                        ${(estadoActual?.total_cobrado_credito ?? 0).toLocaleString()}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 mb-1">
                        <QrCode className="w-4 h-4" />
                        <span>Transferencia</span>
                      </div>
                      <div className="text-lg font-bold text-slate-100">
                        ${(estadoActual?.total_cobrado_transferencia ?? 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                    <span>Arqueo ciego: los saldos teóricos se cotejarán al momento del cierre formal del turno.</span>
                    <button
                      onClick={() => setMostrarArqueoModal(true)}
                      className="px-3 py-1 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white font-medium text-xs transition-colors shrink-0 ml-2"
                    >
                      Realizar Arqueo Ciego
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Sin Turno Activo */
            <div className="py-16 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-200">No hay un turno de caja abierto</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Para registrar cobros y operar la gaveta de efectivo debe iniciar un turno declarando el fondo de cambio inicial.
                </p>
              </div>
              <button
                onClick={() => setMostrarAperturaModal(true)}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-900/40 transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Iniciar Apertura de Caja
              </button>
            </div>
          )
        ) : (
          /* Historial de Turnos */
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
              Historial de Turnos de Caja
            </h3>

            {historial.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-500">No hay turnos registrados aún.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-700/80 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Código</th>
                      <th className="py-3 px-4">Apertura</th>
                      <th className="py-3 px-4">Cajero</th>
                      <th className="py-3 px-4">Fondo Inicial</th>
                      <th className="py-3 px-4">Cierre</th>
                      <th className="py-3 px-4">Cajero Cierre</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {historial.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-200">{t.codigo_visible}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {new Date(t.fecha_apertura).toLocaleDateString()} {new Date(t.fecha_apertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4">{t.operador_apertura}</td>
                        <td className="py-3 px-4 font-mono text-emerald-400">${t.fondo_inicial.toLocaleString()}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {t.fecha_cierre ? `${new Date(t.fecha_cierre).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}
                        </td>
                        <td className="py-3 px-4">{t.operador_cierre || '-'}</td>
                        <td className="py-3 px-4">
                          {t.estado === 'Abierto' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Abierto
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                              Cerrado
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setComprobanteTurnoId(t.id)}
                            className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver Ticket
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      {mostrarAperturaModal && (
        <AperturaTurnoModal
          operadorActual={operadorActual}
          onTurnoAbierto={handleTurnoAbierto}
          onCerrar={() => setMostrarAperturaModal(false)}
        />
      )}

      {mostrarArqueoModal && turno && (
        <ArqueoCiegoModal
          turno={turno}
          operadorActual={operadorActual}
          cuentasPendientes={estadoActual?.cuentas_abiertas_pendientes ?? 0}
          onTurnoCerrado={handleTurnoCerrado}
          onCerrar={() => setMostrarArqueoModal(false)}
        />
      )}

      {mostrarRetiroModal && turno && (
        <RetiroModal
          efectivoDisponible={estadoActual?.efectivo_en_gaveta ?? 0}
          operadorActual={operadorActual}
          onRetiroRegistrado={handleRetiroRegistrado}
          onCerrar={() => setMostrarRetiroModal(false)}
        />
      )}

      {comprobanteTurnoId !== null && (
        <ComprobanteTurnoModal
          turnoId={comprobanteTurnoId}
          onCerrar={() => setComprobanteTurnoId(null)}
        />
      )}
    </div>
  );
};
