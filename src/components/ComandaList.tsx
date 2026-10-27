import React, { useState, useEffect } from 'react';
import { ComandaDto, EstadoComanda } from '../types/comanda';
import { comandaApi } from '../services/comandaApi';
import { Search, Clock, MapPin, RefreshCw, ChevronRight } from 'lucide-react';

interface ComandaListProps {
  onSeleccionarComanda: (comandaId: number) => void;
  comandaSeleccionadaId?: number | null;
}

export const ComandaList: React.FC<ComandaListProps> = ({
  onSeleccionarComanda,
  comandaSeleccionadaId,
}) => {
  const [comandas, setComandas] = useState<ComandaDto[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<EstadoComanda | 'Todas'>('Todas');
  const [busquedaUbicacion, setBusquedaUbicacion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarComandas = async () => {
    try {
      setCargando(true);
      setError(null);
      const res = await comandaApi.listarComandas({
        filtro_estado: filtroEstado,
      });
      setComandas(res);
    } catch (e: any) {
      setError(e.message || 'Error al listar las comandas');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarComandas();
  }, [filtroEstado]);

  const comandasFiltradas = comandas.filter((c) => {
    if (!busquedaUbicacion) return true;
    const term = busquedaUbicacion.toLowerCase();
    return (
      c.ubicacion_nombre.toLowerCase().includes(term) ||
      c.codigo_visible.toLowerCase().includes(term)
    );
  });

  const getBadgeClass = (estado: EstadoComanda) => {
    switch (estado) {
      case 'Abierta':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Cerrada':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      case 'Anulada':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Cabecera y Filtros */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            📑 Comandas Registradas
          </h2>
          <button
            type="button"
            onClick={cargarComandas}
            disabled={cargando}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95 transition-all touch-target"
            title="Refrescar listado"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Barra de búsqueda por texto */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por carpa, sombrilla, mesa o código..."
            value={busquedaUbicacion}
            onChange={(e) => setBusquedaUbicacion(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Filtros de Estado */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['Todas', 'Abierta', 'Cerrada', 'Anulada'] as const).map((estado) => (
            <button
              type="button"
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors touch-target whitespace-nowrap ${
                filtroEstado === estado
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {estado}
            </button>
          ))}
        </div>
      </div>

      {/* Listado de Comandas */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 text-center font-medium">
            {error}
          </div>
        )}

        {cargando && comandas.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando comandas...</div>
        ) : comandasFiltradas.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No se encontraron comandas con los filtros seleccionados.
          </div>
        ) : (
          comandasFiltradas.map((c) => {
            const isSelected = comandaSeleccionadaId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => c.id && onSeleccionarComanda(c.id)}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 ${
                  isSelected ? 'bg-teal-50/70 border-l-4 border-teal-600' : ''
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{c.codigo_visible}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass(
                        c.estado
                      )}`}
                    >
                      {c.estado}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-teal-600" />
                      {c.ubicacion_nombre}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(c.creado_en).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="text-right flex items-center gap-3">
                  <div>
                    <div className="text-base font-extrabold text-slate-900">
                      ${c.total.toLocaleString('es-AR')}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {c.items ? c.items.length : 0} ítems
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

