// src/components/RetiroModal.tsx
// Modal ergonómico para sangrías parciales de efectivo con validación de gaveta (Feature 004)

import React, { useState } from 'react';
import { DollarSign, User, ShieldAlert, AlertCircle, X, ArrowUpRight, HelpCircle } from 'lucide-react';
import { RetiroCajaDto } from '../types/turnos';
import { turnosApi } from '../services/turnosApi';

interface RetiroModalProps {
  efectivoDisponible: number;
  operadorActual: string;
  onRetiroRegistrado: (retiro: RetiroCajaDto) => void;
  onCerrar: () => void;
}

export const RetiroModal: React.FC<RetiroModalProps> = ({
  efectivoDisponible,
  operadorActual,
  onRetiroRegistrado,
  onCerrar,
}) => {
  const [monto, setMonto] = useState<number>(0);
  const [operador, setOperador] = useState(operadorActual || '');
  const [receptor, setReceptor] = useState('');
  const [motivo, setMotivo] = useState('Traslado a caja fuerte por seguridad');
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presets = [10000, 20000, 50000].filter((p) => p <= efectivoDisponible);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (procesando) return;

    if (monto <= 0) {
      setErrorMsg('El monto a retirar debe ser mayor a $0.');
      return;
    }
    if (monto > efectivoDisponible + 0.01) {
      setErrorMsg(`El monto ($${monto.toLocaleString()}) supera el efectivo disponible en la gaveta ($${efectivoDisponible.toLocaleString()}).`);
      return;
    }
    if (!operador.trim()) {
      setErrorMsg('Debe indicar el operador que entrega el efectivo.');
      return;
    }
    if (!receptor.trim()) {
      setErrorMsg('Debe indicar el supervisor o tesorero que recibe el dinero.');
      return;
    }
    if (motivo.trim().length < 4) {
      setErrorMsg('Debe ingresar un motivo de al menos 4 caracteres.');
      return;
    }

    try {
      setProcesando(true);
      setErrorMsg(null);
      const retiro = await turnosApi.registrarRetiro({
        monto,
        operador: operador.trim(),
        receptor: receptor.trim(),
        motivo: motivo.trim(),
      });
      onRetiroRegistrado(retiro);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || 'Error al registrar el retiro de caja.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Registrar Sangría de Efectivo</h2>
              <p className="text-xs text-slate-400">Extracción parcial de gaveta hacia custodia</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Card Efectivo Disponible */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400">Efectivo en Gaveta</span>
              <p className="text-xl font-bold text-emerald-400">${efectivoDisponible.toLocaleString()}</p>
            </div>
            <div className="text-right text-xs text-slate-400">
              <span>Límite máximo de retiro</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Monto a Retirar */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Monto a Extraer ($)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <DollarSign className="w-5 h-5 text-orange-400" />
              </div>
              <input
                type="number"
                min="100"
                max={efectivoDisponible}
                step="100"
                value={monto || ''}
                onChange={(e) => setMonto(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-orange-300 font-bold text-xl placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all"
                required
              />
            </div>

            {presets.length > 0 && (
              <div className="flex gap-2 mt-2">
                {presets.map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => setMonto(val)}
                    className="py-1 px-2.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    ${val.toLocaleString()}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Operador entrega */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Cajero que Entrega
              </label>
              <input
                type="text"
                value={operador}
                onChange={(e) => setOperador(e.target.value)}
                placeholder="Nombre del cajero"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                required
              />
            </div>

            {/* Receptor */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Supervisor / Receptor
              </label>
              <input
                type="text"
                value={receptor}
                onChange={(e) => setReceptor(e.target.value)}
                placeholder="Persona que recibe"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                required
              />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Motivo o Destino del Retiro
            </label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Traslado a caja fuerte, pago a proveedor de hielo, etc."
              className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              required
            />
          </div>

          {/* Botones */}
          <div className="flex items-center justify-end gap-3 pt-3">
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
              disabled={procesando || monto <= 0 || monto > efectivoDisponible}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-semibold text-sm shadow-lg shadow-orange-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <ArrowUpRight className="w-4 h-4" />
              {procesando ? 'Procesando Retiro...' : 'Confirmar Sangría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
