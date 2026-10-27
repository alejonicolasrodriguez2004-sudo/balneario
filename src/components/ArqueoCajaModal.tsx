// src/components/ArqueoCajaModal.tsx
// Modal de resumen y arqueo de caja de turno por medio de pago (Feature 002)

import React, { useEffect, useState } from 'react';
import { DollarSign, CreditCard, ArrowLeftRight, X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ResumenArqueoDto } from '../types/cuentas';
import { cuentasApi } from '../services/cuentasApi';

interface ArqueoCajaModalProps {
  onCerrar: () => void;
}

export const ArqueoCajaModal: React.FC<ArqueoCajaModalProps> = ({ onCerrar }) => {
  const [resumen, setResumen] = useState<ResumenArqueoDto | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarArqueo = async () => {
    setCargando(true);
    setErrorMsg(null);
    try {
      const data = await cuentasApi.obtenerResumenArqueo();
      setResumen(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarArqueo();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
        {/* Encabezado */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Arqueo de Caja del Turno
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Consolidado de ingresos netos agrupados por medio de pago
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {cargando ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mb-2" />
              <span className="text-xs font-bold">Consolidando transacciones del turno...</span>
            </div>
          ) : resumen ? (
            <div className="space-y-4">
              {/* Total Destacado */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-lg shadow-emerald-700/20 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider block">
                    Total Neto Recaudado
                  </span>
                  <span className="text-3xl font-black tracking-tight">
                    ${resumen.total_recaudado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-100 block">Cobros asentados</span>
                  <span className="text-lg font-black">{resumen.cantidad_pagos_activos}</span>
                </div>
              </div>

              {/* Grid por medio de pago */}
              <div className="grid grid-cols-2 gap-3">
                {/* Efectivo */}
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold mb-1">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Efectivo en Caja</span>
                  </div>
                  <span className="text-xl font-black text-emerald-950">
                    ${resumen.total_efectivo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Débito */}
                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50">
                  <div className="flex items-center gap-2 text-indigo-800 text-xs font-bold mb-1">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>Tarjeta Débito</span>
                  </div>
                  <span className="text-xl font-black text-indigo-950">
                    ${resumen.total_debito.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Crédito */}
                <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50">
                  <div className="flex items-center gap-2 text-blue-800 text-xs font-bold mb-1">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Tarjeta Crédito</span>
                  </div>
                  <span className="text-xl font-black text-blue-950">
                    ${resumen.total_credito.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Transferencia */}
                <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/50">
                  <div className="flex items-center gap-2 text-purple-800 text-xs font-bold mb-1">
                    <ArrowLeftRight className="w-4 h-4 text-purple-600" />
                    <span>Transferencia</span>
                  </div>
                  <span className="text-xl font-black text-purple-950">
                    ${resumen.total_transferencia.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Métricas de Auditoría */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                <span className="text-slate-600 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Operaciones activas: {resumen.cantidad_pagos_activos}
                </span>
                <span className="text-slate-600 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Pagos anulados: {resumen.cantidad_pagos_anulados}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            type="button"
            onClick={cargarArqueo}
            disabled={cargando}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold text-xs hover:bg-slate-900 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

