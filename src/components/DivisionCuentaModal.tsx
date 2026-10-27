// src/components/DivisionCuentaModal.tsx
// Asistente ergonómico para cálculo de división de cuentas entre comensales (Feature 002)

import React, { useState } from 'react';
import { Users, DollarSign, X, Check, Calculator } from 'lucide-react';
import { CuentaDto } from '../types/cuentas';
import { cuentasApi } from '../services/cuentasApi';

interface DivisionCuentaModalProps {
  cuenta: CuentaDto;
  onSeleccionarCuota: (montoCuota: number) => void;
  onCerrar: () => void;
}

export const DivisionCuentaModal: React.FC<DivisionCuentaModalProps> = ({
  cuenta,
  onSeleccionarCuota,
  onCerrar,
}) => {
  const [cantidadPartes, setCantidadPartes] = useState<number>(2);

  const cuotas = cuentasApi.calcularDivision(cuenta.saldo_pendiente, cantidadPartes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        {/* Encabezado */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Calculator className="w-5 h-5 text-teal-400" />
              Dividir Cuenta
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {cuenta.codigo_visible} • Saldo: ${cuenta.saldo_pendiente.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <button
            onClick={onCerrar}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de comensales */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              ¿Entre cuántas personas se divide?
            </label>
            <div className="flex items-center gap-2">
              {[2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCantidadPartes(num)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                    cantidadPartes === num
                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {num} partes
                </button>
              ))}
            </div>
          </div>

          {/* Stepper fino */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              Cantidad personalizada:
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCantidadPartes((prev) => Math.max(2, prev - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center"
              >
                -
              </button>
              <span className="text-base font-black text-slate-900 w-6 text-center">
                {cantidadPartes}
              </span>
              <button
                type="button"
                onClick={() => setCantidadPartes((prev) => Math.min(20, prev + 1))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          {/* Desglose de cuotas con absorción de redondeo */}
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Proyección de cobro por persona:
            </span>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cuotas.map((montoCuota, idx) => {
                const esUltima = idx === cuotas.length - 1;
                return (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 rounded-xl border border-slate-200 bg-white hover:border-teal-500 transition group"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Parte {idx + 1} de {cantidadPartes}
                        {esUltima && cuotas.length > 2 && (
                          <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md font-medium border border-amber-200">
                            Ajuste centavos
                          </span>
                        )}
                      </span>
                      <span className="text-base font-black text-teal-800">
                        ${montoCuota.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSeleccionarCuota(montoCuota)}
                      className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200 group-hover:bg-teal-600 group-hover:text-white transition flex items-center gap-1.5"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Cobrar esta cuota
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-300 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

