// src/components/AperturaTurnoModal.tsx
// Modal ergonómico para apertura de turno de caja y declaración del fondo de cambio (Feature 004)

import React, { useState } from 'react';
import { DollarSign, User, ShieldCheck, AlertCircle, X, Banknote } from 'lucide-react';
import { TurnoCajaDto } from '../types/turnos';
import { turnosApi } from '../services/turnosApi';

interface AperturaTurnoModalProps {
  operadorActual: string;
  onTurnoAbierto: (turno: TurnoCajaDto) => void;
  onCerrar: () => void;
}

export const AperturaTurnoModal: React.FC<AperturaTurnoModalProps> = ({
  operadorActual,
  onTurnoAbierto,
  onCerrar,
}) => {
  const [operador, setOperador] = useState(operadorActual || '');
  const [fondoInicial, setFondoInicial] = useState<number>(20000);
  const [procesando, setProcesando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const presets = [10000, 20000, 30000, 50000];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (procesando) return;

    if (!operador.trim()) {
      setErrorMsg('Debe indicar el nombre del operador o cajero responsable.');
      return;
    }
    if (fondoInicial < 0 || isNaN(fondoInicial)) {
      setErrorMsg('El fondo inicial en efectivo no puede ser negativo.');
      return;
    }

    try {
      setProcesando(true);
      setErrorMsg(null);
      const turno = await turnosApi.abrirTurno({
        operador: operador.trim(),
        fondo_inicial: fondoInicial,
      });
      onTurnoAbierto(turno);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg || 'Error al abrir el turno de caja.');
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
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Apertura de Turno de Caja</h2>
              <p className="text-xs text-slate-400">Declaración de fondo inicial de cambio en efectivo</p>
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
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Operador */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Cajero / Operador Responsable
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={operador}
                onChange={(e) => setOperador(e.target.value)}
                placeholder="Nombre o legajo del cajero"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Fondo Inicial */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Fondo Inicial de Cambio en Efectivo ($)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <input
                type="number"
                min="0"
                step="100"
                value={fondoInicial}
                onChange={(e) => setFondoInicial(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-emerald-300 font-bold text-xl placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                required
              />
            </div>

            {/* Presets rápidos */}
            <div className="grid grid-cols-4 gap-2 mt-2.5">
              {presets.map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setFondoInicial(val)}
                  className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all flex items-center justify-center gap-1 ${
                    fondoInicial === val
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  ${val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Al iniciar el turno, la terminal bloqueará aperturas simultáneas hasta su arqueo y cierre.</span>
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
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {procesando ? 'Iniciando Turno...' : 'Confirmar Apertura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
