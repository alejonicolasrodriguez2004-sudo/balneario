import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface AnulacionModalProps {
  isOpen: boolean;
  titulo: string;
  subtitulo: string;
  onConfirmar: (motivo: string) => Promise<void>;
  onCancelar: () => void;
  accionTexto?: string;
}

export const AnulacionModal: React.FC<AnulacionModalProps> = ({
  isOpen,
  titulo,
  subtitulo,
  onConfirmar,
  onCancelar,
  accionTexto = 'Confirmar Baja Justificada',
}) => {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (motivo.trim().length < 4) {
      setError('El motivo debe ser explícito y contener al menos 4 caracteres.');
      return;
    }

    try {
      setProcesando(true);
      setError(null);
      await onConfirmar(motivo.trim());
      setMotivo('');
    } catch (err: any) {
      setError(err.message || 'Error al procesar la anulación');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">{titulo}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelar}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
            <strong>Aviso de Auditoría:</strong> Conforme al Artículo VI de la Constitución, esta operación no borra datos físicos; queda registrada de forma inmutable con su marca temporal, usuario actuante y la justificación indicada.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Motivo obligatorio de anulación / cancelación:
            </label>
            <textarea
              rows={3}
              required
              placeholder="Ej. Cliente se retira por tormenta repentina / Error de digitación..."
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                if (error) setError(null);
              }}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onCancelar}
              disabled={procesando}
              className="px-4 py-2.5 rounded-xl border border-slate-300 font-semibold text-sm text-slate-700 hover:bg-slate-100 touch-target"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={procesando || motivo.trim().length < 4}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-600/20 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed touch-target"
            >
              {procesando ? 'Procesando...' : accionTexto}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

