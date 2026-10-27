// src/components/CobroModal.tsx
// Modal táctil ergonómico para cobro multimedio y cálculo de vuelto (Feature 002)

import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, ArrowLeftRight, Check, X, AlertTriangle } from 'lucide-react';
import { CuentaDto, MedioPago, RegistrarPagoResponse } from '../types/cuentas';
import { cuentasApi } from '../services/cuentasApi';
import { turnosApi } from '../services/turnosApi';

interface CobroModalProps {
  cuenta: CuentaDto;
  montoSugerido?: number;
  operadorActual: string;
  onPagoCompletado: (resp: RegistrarPagoResponse) => void;
  onCerrar: () => void;
}

export const CobroModal: React.FC<CobroModalProps> = ({
  cuenta,
  montoSugerido,
  operadorActual,
  onPagoCompletado,
  onCerrar,
}) => {
  const [medioPago, setMedioPago] = useState<MedioPago>('Efectivo');
  const [monto, setMonto] = useState<number>(montoSugerido ?? cuenta.saldo_pendiente);
  const [montoEntregado, setMontoEntregado] = useState<number>(
    medioPago === 'Efectivo' ? Math.max(montoSugerido ?? cuenta.saldo_pendiente, 0) : 0
  );
  const [referencia, setReferencia] = useState<string>('');
  const [procesando, setProcesando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sinTurnoAbierto, setSinTurnoAbierto] = useState<boolean>(false);

  useEffect(() => {
    const verificarTurno = async () => {
      try {
        const est = await turnosApi.obtenerEstadoTurnoActual();
        if (!est.turno_abierto) {
          setSinTurnoAbierto(true);
        }
      } catch {
        // En caso de error de verificación, no bloquear
      }
    };
    verificarTurno();
  }, []);

  // Vuelto dinámico en tiempo real
  const vuelto =
    medioPago === 'Efectivo' && montoEntregado >= monto
      ? Math.round((montoEntregado - monto) * 100) / 100
      : 0;

  const handleMontoRapidoEfectivo = (entregado: number) => {
    setMontoEntregado(entregado);
  };

  const handleConfirmarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (procesando) return; // Prevención doble clic (SC-006)

    setErrorMsg(null);
    if (monto <= 0) {
      setErrorMsg('El monto a cobrar debe ser mayor a $0.');
      return;
    }
    if (monto > cuenta.saldo_pendiente + 0.01) {
      setErrorMsg(`El monto ($${monto}) supera el saldo pendiente ($${cuenta.saldo_pendiente}).`);
      return;
    }
    if (medioPago === 'Efectivo' && montoEntregado < monto) {
      setErrorMsg('El monto entregado no puede ser menor al importe a pagar.');
      return;
    }

    setProcesando(true);
    try {
      const resp = await cuentasApi.registrarPago({
        cuenta_id: cuenta.id,
        medio_pago: medioPago,
        monto,
        monto_entregado: medioPago === 'Efectivo' ? montoEntregado : undefined,
        referencia_externa: referencia.trim() ? referencia.trim() : undefined,
        operador: operadorActual,
        token_idempotencia: `pago-${cuenta.id}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      });
      onPagoCompletado(resp);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Encabezado */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Cobro de Cuenta
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {cuenta.codigo_visible} • {cuenta.ubicacion_nombre}
            </p>
          </div>
          <button
            onClick={onCerrar}
            disabled={procesando}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen de Saldo */}
        <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex justify-between items-center">
          <div>
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Saldo Pendiente
            </span>
            <span className="text-2xl font-black text-emerald-950">
              ${cuenta.saldo_pendiente.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Total Cuenta</span>
            <span className="text-sm font-bold text-slate-700">
              ${cuenta.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleConfirmarPago} className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Advertencia sin turno de caja abierto (Feature 004, T034) */}
          {sinTurnoAbierto && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Aviso de Caja:</span> No hay un turno de caja abierto en esta terminal. Este cobro se registrará pero no quedará vinculado a una gaveta activa.
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Selector de Medio de Pago */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Medio de Pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMedioPago('Efectivo')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  medioPago === 'Efectivo'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Efectivo
              </button>

              <button
                type="button"
                onClick={() => setMedioPago('Tarjeta Débito')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  medioPago === 'Tarjeta Débito'
                    ? 'border-sky-600 bg-sky-50 text-sky-900 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-sky-600" />
                Tarjeta Débito
              </button>

              <button
                type="button"
                onClick={() => setMedioPago('Tarjeta Crédito')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  medioPago === 'Tarjeta Crédito'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4 text-indigo-600" />
                Tarjeta Crédito
              </button>

              <button
                type="button"
                onClick={() => setMedioPago('Transferencia')}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  medioPago === 'Transferencia'
                    ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                Transferencia
              </button>
            </div>
          </div>

          {/* Importe a cobrar */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-700">
                Importe a Imputar ($)
              </label>
              <button
                type="button"
                onClick={() => {
                  setMonto(cuenta.saldo_pendiente);
                  if (medioPago === 'Efectivo') setMontoEntregado(cuenta.saldo_pendiente);
                }}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 underline"
              >
                Cobrar Total (${cuenta.saldo_pendiente.toLocaleString('es-AR')})
              </button>
            </div>
            <input
              type="number"
              step="any"
              min="1"
              max={cuenta.saldo_pendiente}
              value={monto || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setMonto(val);
                if (medioPago === 'Efectivo' && montoEntregado < val) {
                  setMontoEntregado(val);
                }
              }}
              className="w-full text-lg font-black px-4 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none text-slate-800"
              required
            />
          </div>

          {/* Cálculo de Efectivo y Vuelto */}
          {medioPago === 'Efectivo' && (
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Monto Entregado por el Cliente ($)
                </label>
                <input
                  type="number"
                  step="any"
                  min={monto}
                  value={montoEntregado || ''}
                  onChange={(e) => setMontoEntregado(parseFloat(e.target.value) || 0)}
                  className="w-full text-base font-bold px-3 py-2 rounded-lg border border-slate-300 focus:border-emerald-600 outline-none"
                  required
                />
              </div>

              {/* Botones de efectivo rápido */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                  Billetes Comunes
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[1000, 2000, 5000, 10000, 20000].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => handleMontoRapidoEfectivo(val)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 transition"
                    >
                      ${val.toLocaleString('es-AR')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vuelto calculado */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-600">Vuelto a entregar:</span>
                <span
                  className={`text-lg font-black ${
                    vuelto >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  ${vuelto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Referencia opcional para medios electrónicos */}
          {medioPago !== 'Efectivo' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                N° de Comprobante / Cupón POS (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: CUPON-84920"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-600 outline-none"
              />
            </div>
          )}

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-slate-100 flex gap-2">
            <button
              type="button"
              onClick={onCerrar}
              disabled={procesando}
              className="flex-1 py-3 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando || monto <= 0 || (medioPago === 'Efectivo' && montoEntregado < monto)}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition"
            >
              <Check className="w-4 h-4" />
              <span>{procesando ? 'Procesando...' : `Asentar Cobro ($${monto.toLocaleString('es-AR')})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
