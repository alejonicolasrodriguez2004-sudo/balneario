// src/components/ComprobanteTurnoModal.tsx
// Visualizador e impresor de comprobante de liquidación de turno en formato térmico 80mm (Feature 004)

import React, { useEffect, useState } from 'react';
import { Printer, Copy, Check, X, Receipt, FileText, AlertCircle } from 'lucide-react';
import { DetalleTurnoCompletoDto } from '../types/turnos';
import { turnosApi } from '../services/turnosApi';

interface ComprobanteTurnoModalProps {
  turnoId: number;
  detalleInicial?: DetalleTurnoCompletoDto;
  onCerrar: () => void;
}

export const ComprobanteTurnoModal: React.FC<ComprobanteTurnoModalProps> = ({
  turnoId,
  detalleInicial,
  onCerrar,
}) => {
  const [ticketText, setTicketText] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(true);
  const [copiado, setCopiado] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const cargarComprobante = async () => {
      try {
        setCargando(true);
        setErrorMsg(null);
        const txt = await turnosApi.generarComprobante(turnoId);
        setTicketText(txt);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMsg(msg || 'No se pudo generar el comprobante.');
      } finally {
        setCargando(false);
      }
    };

    cargarComprobante();
  }, [turnoId]);

  const handleCopiar = () => {
    if (!ticketText) return;
    navigator.clipboard.writeText(ticketText);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Comprobante de Liquidación</h2>
              <p className="text-xs text-slate-400">Formato térmico monocromático de 80 mm</p>
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {cargando ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Generando comprobante monospaciado...
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
              <pre className="font-mono text-xs text-slate-200 leading-relaxed whitespace-pre select-all">
                {ticketText}
              </pre>
            </div>
          )}
        </div>

        {/* Footer / Acciones */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-800/40">
          <button
            type="button"
            onClick={handleCopiar}
            disabled={cargando || !ticketText}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-800 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copiado ? 'Copiado al portapapeles' : 'Copiar Texto'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleImprimir}
              disabled={cargando || !ticketText}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs shadow-lg shadow-indigo-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              Imprimir Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
