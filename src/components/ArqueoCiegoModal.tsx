// src/components/ArqueoCiegoModal.tsx
// Modal ergonómico para Arqueo Ciego de Cierre de Caja y Conciliación (Feature 004)

import React, { useState } from 'react';
import {
  Banknote,
  CreditCard,
  QrCode,
  AlertTriangle,
  FileText,
  Lock,
  X,
  User,
  AlertCircle,
} from 'lucide-react';
import { DetalleTurnoCompletoDto, TurnoCajaDto } from '../types/turnos';
import { turnosApi } from '../services/turnosApi';

interface ArqueoCiegoModalProps {
  turno: TurnoCajaDto;
  operadorActual: string;
  cuentasPendientes: number;
  onTurnoCerrado: (detalle: DetalleTurnoCompletoDto) => void;
  onCerrar: () => void;
}

export const ArqueoCiegoModal: React.FC<ArqueoCiegoModalProps> = ({
  turno,
  operadorActual,
  cuentasPendientes,
  onTurnoCerrado,
  onCerrar,
}) => {
  const [operador, setOperador] = useState(operadorActual || '');
  const [declaradoEfectivo, setDeclaradoEfectivo] = useState<string>('');
  const [declaradoDebito, setDeclaradoDebito] = useState<string>('');
  const [declaradoCredito, setDeclaradoCredito] = useState<string>('');
  const [declaradoTransferencia, setDeclaradoTransferencia] = useState<string>('');
  const [justificacion, setJustificacion] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');
  const [mostrarJustificacion, setMostrarJustificacion] = useState<boolean>(false);
  const [procesando, setProcesando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (procesando) return;

    if (!operador.trim()) {
      setErrorMsg('Debe indicar el operador o supervisor que realiza el arqueo.');
      return;
    }

    const ef = parseFloat(declaradoEfectivo) || 0;
    const deb = parseFloat(declaradoDebito) || 0;
    const cre = parseFloat(declaradoCredito) || 0;
    const tra = parseFloat(declaradoTransferencia) || 0;

    if (ef < 0 || deb < 0 || cre < 0 || tra < 0) {
      setErrorMsg('Los importes declarados no pueden ser negativos.');
      return;
    }

    try {
      setProcesando(true);
      setErrorMsg(null);

      const detalle = await turnosApi.cerrarTurnoArqueoCiego({
        declarado_efectivo: ef,
        declarado_debito: deb,
        declarado_credito: cre,
        declarado_transferencia: tra,
        justificacion: justificacion.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        operador: operador.trim(),
      });

      onTurnoCerrado(detalle);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('JUSTIFICACION_REQUERIDA') || msg.toLowerCase().includes('justificación')) {
        setMostrarJustificacion(true);
        setErrorMsg('La discrepancia de efectivo supera los $1.000. Por política de control, debe registrar obligatoriamente una justificación o descargo.');
      } else {
        setErrorMsg(msg || 'Error al procesar el arqueo de cierre.');
      }
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Arqueo Ciego y Cierre de Turno</h2>
              <p className="text-xs text-slate-400">
                Turno: <span className="font-semibold text-slate-300">{turno.codigo_visible}</span> • Los saldos teóricos permanecen ocultos
              </p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            disabled={procesando}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Advertencia de Cuentas Pendientes si las hay */}
          {cuentasPendientes > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold">Atención: Hay {cuentasPendientes} cuenta(s) abierta(s) sin liquidar</p>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  El turno puede cerrarse, pero esas cuentas deberán ser liquidadas en el siguiente turno que se abra.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Operador de cierre */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Cajero / Supervisor que Cierra
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={operador}
                onChange={(e) => setOperador(e.target.value)}
                placeholder="Nombre del responsable"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all text-sm"
                required
              />
            </div>
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 pt-1">
            Recuento Físico Ciego (Ingrese lo contado sin consultar el sistema)
          </div>

          {/* Grid de 4 medios de pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Efectivo */}
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <Banknote className="w-4 h-4" />
                <span>Efectivo en Gaveta ($)</span>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0.00"
                value={declaradoEfectivo}
                onChange={(e) => setDeclaradoEfectivo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-emerald-300 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                required
              />
              <p className="text-[11px] text-slate-400">Total billetes + monedas contados</p>
            </div>

            {/* 2. Tarjeta Débito */}
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
                <CreditCard className="w-4 h-4" />
                <span>Cupones Débito ($)</span>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0.00"
                value={declaradoDebito}
                onChange={(e) => setDeclaradoDebito(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sky-300 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
              <p className="text-[11px] text-slate-400">Suma de vouchers terminal POS</p>
            </div>

            {/* 3. Tarjeta Crédito */}
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                <CreditCard className="w-4 h-4" />
                <span>Cupones Crédito ($)</span>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0.00"
                value={declaradoCredito}
                onChange={(e) => setDeclaradoCredito(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-indigo-300 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <p className="text-[11px] text-slate-400">Suma de vouchers crédito</p>
            </div>

            {/* 4. Transferencias / QR */}
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-purple-400">
                <QrCode className="w-4 h-4" />
                <span>Transferencias / QR ($)</span>
              </div>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0.00"
                value={declaradoTransferencia}
                onChange={(e) => setDeclaradoTransferencia(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-purple-300 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-purple-500/40"
              />
              <p className="text-[11px] text-slate-400">Comprobantes billeteras virtuales</p>
            </div>
          </div>

          {/* Campo de Justificación obligatorio si desvío > $1.000 */}
          {mostrarJustificacion && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider">
                <FileText className="w-4 h-4" />
                <span>Justificación Obligatoria de Desvío (&gt; $1.000)</span>
              </div>
              <textarea
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                rows={2}
                placeholder="Explique el motivo del faltante o sobrante detectado..."
                className="w-full p-2.5 bg-slate-900 border border-rose-500/40 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 placeholder-slate-500"
                required
              />
            </div>
          )}

          {/* Observaciones generales opcionales */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Observaciones de Cierre (Opcional)
            </label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas generales del turno para administración"
              className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
            />
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              disabled={procesando}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando}
              className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-semibold text-sm shadow-lg shadow-amber-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {procesando ? 'Sellando Turno...' : 'Confirmar y Cerrar Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
