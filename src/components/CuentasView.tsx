// src/components/CuentasView.tsx
// Vista principal de Gestión de Cuentas, Cobros y Caja (Feature 002)

import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  Receipt,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  XCircle,
  Lock,
  Unlock,
  CreditCard,
  ArrowLeftRight,
} from 'lucide-react';
import { CuentaDto, CuentaDetalladaDto } from '../types/cuentas';
import { Ubicacion } from '../types/comanda';
import { cuentasApi } from '../services/cuentasApi';
import { comandaApi } from '../services/comandaApi';
import { CobroModal } from './CobroModal';
import { DivisionCuentaModal } from './DivisionCuentaModal';
import { ArqueoCajaModal } from './ArqueoCajaModal';

interface CuentasViewProps {
  operadorActual: string;
}

export const CuentasView: React.FC<CuentasViewProps> = ({ operadorActual }) => {
  const [cuentas, setCuentas] = useState<CuentaDto[]>([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState<CuentaDetalladaDto | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modales
  const [modalCobro, setModalCobro] = useState<boolean>(false);
  const [montoCobroSugerido, setMontoCobroSugerido] = useState<number | undefined>(undefined);
  const [modalDivision, setModalDivision] = useState<boolean>(false);
  const [modalArqueo, setModalArqueo] = useState<boolean>(false);
  const [modalAbrirCuenta, setModalAbrirCuenta] = useState<boolean>(false);
  const [ubicacionesDisponibles, setUbicacionesDisponibles] = useState<Ubicacion[]>([]);
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<string>('');

  // Estados de anulación
  const [pagoAAnularId, setPagoAAnularId] = useState<number | null>(null);
  const [motivoAnulacionPago, setMotivoAnulacionPago] = useState<string>('');
  const [modalAnularCuenta, setModalAnularCuenta] = useState<boolean>(false);
  const [motivoAnulacionCuenta, setMotivoAnulacionCuenta] = useState<string>('');
  const [procesandoAccion, setProcesandoAccion] = useState<boolean>(false);

  const cargarCuentas = async () => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const data = await cuentasApi.listarCuentasActivas();
      setCuentas(data);

      if (cuentaSeleccionada) {
        // Recargar detalle de la cuenta actualmente en pantalla
        const detalle = await cuentasApi.obtenerCuenta(cuentaSeleccionada.id);
        setCuentaSeleccionada(detalle);
      } else if (data.length > 0) {
        const primero = await cuentasApi.obtenerCuenta(data[0].id);
        setCuentaSeleccionada(primero);
      } else {
        setCuentaSeleccionada(null);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setCargando(false);
    }
  };

  const seleccionarCuenta = async (id: number) => {
    try {
      const detalle = await cuentasApi.obtenerCuenta(id);
      setCuentaSeleccionada(detalle);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const abrirModalNuevaCuenta = async () => {
    try {
      const catalogos = await comandaApi.obtenerCatalogos();
      setUbicacionesDisponibles(catalogos.ubicaciones.filter((u) => u.activo));
      if (catalogos.ubicaciones.length > 0) {
        setUbicacionSeleccionada(catalogos.ubicaciones[0].id);
      }
      setModalAbrirCuenta(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  };

  const handleConfirmarAbrirCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ubicacionSeleccionada) return;
    setProcesandoAccion(true);
    setErrorMsg(null);
    try {
      const nueva = await cuentasApi.abrirCuenta(ubicacionSeleccionada, operadorActual);
      setModalAbrirCuenta(false);
      await cargarCuentas();
      setCuentaSeleccionada(nueva);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleCerrarYLiberar = async () => {
    if (!cuentaSeleccionada) return;
    if (cuentaSeleccionada.saldo_pendiente > 0.01) {
      setErrorMsg('No se puede cerrar la cuenta ni liberar la ubicación porque posee saldo pendiente impago.');
      return;
    }
    setProcesandoAccion(true);
    setErrorMsg(null);
    try {
      await cuentasApi.cerrarCuentaYLiberar(cuentaSeleccionada.id, operadorActual);
      await cargarCuentas();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleConfirmarAnularPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaSeleccionada || !pagoAAnularId) return;
    if (motivoAnulacionPago.trim().length < 4) {
      setErrorMsg('El motivo de anulación es obligatorio (mínimo 4 caracteres).');
      return;
    }
    setProcesandoAccion(true);
    try {
      const actualizada = await cuentasApi.anularPago(
        cuentaSeleccionada.id,
        pagoAAnularId,
        motivoAnulacionPago.trim(),
        operadorActual
      );
      setCuentaSeleccionada(actualizada);
      setPagoAAnularId(null);
      setMotivoAnulacionPago('');
      await cargarCuentas();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setProcesandoAccion(false);
    }
  };

  const handleConfirmarAnularCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuentaSeleccionada) return;
    if (motivoAnulacionCuenta.trim().length < 4) {
      setErrorMsg('El motivo de anulación es obligatorio (mínimo 4 caracteres).');
      return;
    }
    setProcesandoAccion(true);
    try {
      await cuentasApi.anularCuenta(
        cuentaSeleccionada.id,
        motivoAnulacionCuenta.trim(),
        operadorActual
      );
      setModalAnularCuenta(false);
      setMotivoAnulacionCuenta('');
      await cargarCuentas();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setProcesandoAccion(false);
    }
  };

  useEffect(() => {
    cargarCuentas();
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[600px] gap-4">
      {/* Barra Superior de Herramientas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-md">
            <Receipt className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">Cuentas y Caja</h2>
            <p className="text-xs text-slate-500">
              Consolidación de consumos, registro de pagos multimedio y control de caja
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={abrirModalNuevaCuenta}
            className="px-4 py-2 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-teal-700 shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Abrir / Consolidar Cuenta</span>
          </button>

          <button
            type="button"
            onClick={() => setModalArqueo(true)}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-900 shadow-sm transition"
          >
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Arqueo de Turno</span>
          </button>

          <button
            type="button"
            onClick={cargarCuentas}
            disabled={cargando}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refrescar listado"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex justify-between items-center">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 font-bold">
            ✕
          </button>
        </div>
      )}

      {/* Grid Principal: Listado Lateral + Detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden">
        {/* Listado Lateral de Cuentas */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700">
              Cuentas Activas ({cuentas.length})
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Abiertas o Pagadas</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cargando && cuentas.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mb-2" />
                <span className="text-xs">Cargando cuentas...</span>
              </div>
            ) : cuentas.length === 0 ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center">
                <Receipt className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">No hay cuentas abiertas</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Pulsa "Abrir / Consolidar Cuenta" para liquidar los consumos de una mesa o carpa.
                </p>
              </div>
            ) : (
              cuentas.map((c) => {
                const seleccionada = cuentaSeleccionada?.id === c.id;
                const estaPagada = c.estado === 'Pagada' || c.saldo_pendiente <= 0.001;

                return (
                  <div
                    key={c.id}
                    onClick={() => seleccionarCuenta(c.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${
                      seleccionada
                        ? 'border-teal-600 bg-teal-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{c.codigo_visible}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                            estaPagada
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {estaPagada ? 'Pagada' : 'Abierta'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-600 mt-0.5">{c.ubicacion_nombre}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 block">Saldo</span>
                      <span
                        className={`text-sm font-black ${
                          estaPagada ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        ${c.saldo_pendiente.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Detalle de Cuenta Seleccionada */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {cuentaSeleccionada ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Header Detalle */}
              <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      {cuentaSeleccionada.codigo_visible}
                    </h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        cuentaSeleccionada.estado === 'Pagada'
                          ? 'bg-emerald-100 text-emerald-800'
                          : cuentaSeleccionada.estado === 'Cerrada'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {cuentaSeleccionada.estado}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ubicación: <strong className="text-slate-700">{cuentaSeleccionada.ubicacion_nombre}</strong> • Responsable: {cuentaSeleccionada.creado_por}
                  </p>
                </div>

                {/* Balances */}
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Bruto</span>
                    <span className="text-base font-bold text-slate-700">
                      ${cuentaSeleccionada.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pl-4 border-l border-slate-200">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Saldo Pendiente</span>
                    <span
                      className={`text-xl font-black ${
                        cuentaSeleccionada.saldo_pendiente <= 0.001
                          ? 'text-emerald-700'
                          : 'text-rose-600'
                      }`}
                    >
                      ${cuentaSeleccionada.saldo_pendiente.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botonera de Acciones Rápidas de Cobro */}
              <div className="p-3 bg-white border-b border-slate-100 flex flex-wrap gap-2">
                {cuentaSeleccionada.estado !== 'Cerrada' && cuentaSeleccionada.estado !== 'Anulada' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMontoCobroSugerido(cuentaSeleccionada.saldo_pendiente);
                        setModalCobro(true);
                      }}
                      disabled={cuentaSeleccionada.saldo_pendiente <= 0.001}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-700 shadow-sm disabled:opacity-40 transition"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Cobrar Saldo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalDivision(true)}
                      disabled={cuentaSeleccionada.saldo_pendiente <= 0.001}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-200 disabled:opacity-40 transition border border-slate-200"
                    >
                      <Users className="w-4 h-4 text-teal-600" />
                      <span>Dividir Cuenta</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCerrarYLiberar}
                      disabled={procesandoAccion || cuentaSeleccionada.saldo_pendiente > 0.001}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-slate-900 shadow-sm disabled:opacity-40 transition ml-auto"
                      title={
                        cuentaSeleccionada.saldo_pendiente > 0.001
                          ? 'Debe saldar la cuenta por completo antes de liberar'
                          : 'Liberar ubicación para nuevos comensales'
                      }
                    >
                      {cuentaSeleccionada.saldo_pendiente <= 0.001 ? (
                        <Unlock className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Lock className="w-4 h-4 text-rose-400" />
                      )}
                      <span>Cerrar y Liberar Ubicación</span>
                    </button>
                  </>
                )}
              </div>

              {/* Contenido con Scroll: Comandas y Pagos */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Comandas Consolidadas */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    Comandas Asociadas ({cuentaSeleccionada.comandas_asociadas.length})
                  </h4>
                  <div className="space-y-1.5">
                    {cuentaSeleccionada.comandas_asociadas.map((cmd) => (
                      <div
                        key={cmd.comanda_id}
                        className="flex justify-between items-center p-3 rounded-xl border border-slate-200 bg-slate-50/50 text-xs"
                      >
                        <span className="font-bold text-slate-800">{cmd.codigo_visible}</span>
                        <span className="font-bold text-slate-700">
                          ${cmd.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Historial de Pagos y Cobros */}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                    Historial de Cobros ({cuentaSeleccionada.pagos.length})
                  </h4>
                  {cuentaSeleccionada.pagos.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                      No se han registrado pagos para esta cuenta aún.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cuentaSeleccionada.pagos.map((p) => {
                        const cancelado = p.estado === 'Cancelado';

                        return (
                          <div
                            key={p.id}
                            className={`p-3 rounded-xl border flex justify-between items-center text-xs transition ${
                              cancelado
                                ? 'border-rose-200 bg-rose-50/40 text-slate-400 line-through'
                                : 'border-slate-200 bg-white'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                  {p.medio_pago === 'Efectivo' ? (
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : p.medio_pago === 'Transferencia' ? (
                                    <ArrowLeftRight className="w-3.5 h-3.5 text-purple-600" />
                                  ) : (
                                    <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                                  )}
                                  {p.medio_pago}
                                </span>
                                {cancelado && (
                                  <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold no-underline">
                                    Anulado
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5 no-underline">
                                {new Date(p.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Por: {p.creado_por}
                                {p.referencia_externa && ` • Ref: ${p.referencia_externa}`}
                                {p.vuelto && p.vuelto > 0 && ` • Vuelto: $${p.vuelto}`}
                              </span>
                              {cancelado && p.motivo_anulacion && (
                                <span className="text-[11px] text-rose-700 block mt-1 font-medium no-underline">
                                  Motivo anulación: {p.motivo_anulacion} ({p.cancelado_por})
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-sm font-black text-slate-900">
                                ${p.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                              </span>

                              {!cancelado && cuentaSeleccionada.estado !== 'Cerrada' && (
                                <button
                                  type="button"
                                  onClick={() => setPagoAAnularId(p.id)}
                                  className="text-xs text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded hover:bg-rose-50 transition"
                                  title="Anular cobro por error"
                                >
                                  Anular
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Opción de Anular Cuenta completa si no tiene pagos */}
                {cuentaSeleccionada.estado === 'Abierta' &&
                  cuentaSeleccionada.pagos.filter((p) => p.estado === 'Activo').length === 0 && (
                    <div className="pt-4 border-t border-slate-200 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setModalAnularCuenta(true)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 hover:underline"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Anular apertura de cuenta por error
                      </button>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Receipt className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-bold text-slate-700">Ninguna cuenta seleccionada</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Selecciona una cuenta activa del listado lateral para inspeccionar sus comandas, asentar cobros o liberar la mesa.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Abrir / Consolidar Cuenta */}
      {modalAbrirCuenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                <Receipt className="w-5 h-5 text-teal-400" />
                Abrir Cuenta de Consumo
              </h3>
              <button
                onClick={() => setModalAbrirCuenta(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmarAbrirCuenta} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ubicación Física del Establecimiento
                </label>
                <select
                  value={ubicacionSeleccionada}
                  onChange={(e) => setUbicacionSeleccionada(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-teal-600 outline-none"
                >
                  {ubicacionesDisponibles.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} ({u.tipo})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Se buscarán todas las comandas activas pendientes asociadas a esta ubicación y se unificarán en una sola cuenta.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAbrirCuenta(false)}
                  disabled={procesandoAccion}
                  className="flex-1 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={procesandoAccion}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 shadow-sm disabled:opacity-50"
                >
                  {procesandoAccion ? 'Consolidando...' : 'Consolidar y Abrir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cobro */}
      {modalCobro && cuentaSeleccionada && (
        <CobroModal
          cuenta={cuentaSeleccionada}
          montoSugerido={montoCobroSugerido}
          operadorActual={operadorActual}
          onPagoCompletado={() => {
            setModalCobro(false);
            setMontoCobroSugerido(undefined);
            cargarCuentas();
          }}
          onCerrar={() => {
            setModalCobro(false);
            setMontoCobroSugerido(undefined);
          }}
        />
      )}

      {/* Modal: División de Cuenta */}
      {modalDivision && cuentaSeleccionada && (
        <DivisionCuentaModal
          cuenta={cuentaSeleccionada}
          onSeleccionarCuota={(cuota) => {
            setModalDivision(false);
            setMontoCobroSugerido(cuota);
            setModalCobro(true);
          }}
          onCerrar={() => setModalDivision(false)}
        />
      )}

      {/* Modal: Arqueo de Turno */}
      {modalArqueo && <ArqueoCajaModal onCerrar={() => setModalArqueo(false)} />}

      {/* Modal: Anulación de Pago */}
      {pagoAAnularId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <h4 className="text-sm font-black text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Anulación de Pago
            </h4>
            <p className="text-xs text-slate-600">
              El pago pasará a estado Anulado y el importe se restaurará al saldo pendiente de la cuenta. Ingrese el motivo justificado:
            </p>
            <input
              type="text"
              placeholder="Motivo (mínimo 4 caracteres)"
              value={motivoAnulacionPago}
              onChange={(e) => setMotivoAnulacionPago(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-rose-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPagoAAnularId(null);
                  setMotivoAnulacionPago('');
                }}
                className="flex-1 py-2 text-xs font-bold border border-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAnularPago}
                disabled={procesandoAccion || motivoAnulacionPago.trim().length < 4}
                className="flex-1 py-2 text-xs font-bold bg-rose-600 text-white rounded-lg disabled:opacity-50 hover:bg-rose-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Anulación de Cuenta */}
      {modalAnularCuenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <h4 className="text-sm font-black text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Anulación de Cuenta
            </h4>
            <p className="text-xs text-slate-600">
              Se anulará administrativamente la cuenta y las comandas asociadas quedarán liberadas. Ingrese el motivo:
            </p>
            <input
              type="text"
              placeholder="Motivo (mínimo 4 caracteres)"
              value={motivoAnulacionCuenta}
              onChange={(e) => setMotivoAnulacionCuenta(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-rose-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setModalAnularCuenta(false);
                  setMotivoAnulacionCuenta('');
                }}
                className="flex-1 py-2 text-xs font-bold border border-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarAnularCuenta}
                disabled={procesandoAccion || motivoAnulacionCuenta.trim().length < 4}
                className="flex-1 py-2 text-xs font-bold bg-rose-600 text-white rounded-lg disabled:opacity-50 hover:bg-rose-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

