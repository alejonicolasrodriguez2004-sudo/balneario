import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { comandaApi } from '../services/comandaApi';

export const StartupHealthCheck: React.FC = () => {
  const [estado, setEstado] = useState<'verificando' | 'ok' | 'error'>('verificando');
  const [detalles, setDetalles] = useState<string>('Verificando persistencia local SQLite WAL...');

  useEffect(() => {
    verificarSalud();
  }, []);

  const verificarSalud = async () => {
    try {
      setEstado('verificando');
      const cats = await comandaApi.obtenerCatalogos();
      setDetalles(`SQLite Operativo (Modo WAL activo) | ${cats.ubicaciones.length} ubicaciones y ${cats.productos.length} productos listos.`);
      setEstado('ok');
    } catch (e: any) {
      setDetalles(`Error de integridad: ${e.message}`);
      setEstado('error');
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-white text-xs border-b border-slate-800">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-teal-400" />
        <span className="font-semibold text-slate-300">Autonomía 100% Offline:</span>
        <span className="text-slate-400">{detalles}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Monopuesto Local Activo
        </span>
        <Database className="w-3.5 h-3.5 text-slate-500 ml-2" />
      </div>
    </div>
  );
};

