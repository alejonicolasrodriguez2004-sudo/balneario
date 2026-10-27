import React, { useState, useEffect } from 'react';
import {
  UbicacionDto,
  ProductoDto,
  ItemComandaInput,
  TipoUbicacion,
} from '../types/comanda';
import { comandaApi } from '../services/comandaApi';
import { Plus, Minus, Trash2, Send, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ComandaFormProps {
  onComandaCreada?: () => void;
  operadorActual?: string;
}

export const ComandaForm: React.FC<ComandaFormProps> = ({
  onComandaCreada,
  operadorActual = 'cajero_turno',
}) => {
  const [ubicaciones, setUbicaciones] = useState<UbicacionDto[]>([]);
  const [productos, setProductos] = useState<ProductoDto[]>([]);
  const [filtroTipoUbicacion, setFiltroTipoUbicacion] = useState<TipoUbicacion | 'Todas'>('Todas');
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState<string>('');
  const [itemsCargados, setItemsCargados] = useState<ItemComandaInput[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    try {
      setCargandoCatalogos(true);
      const res = await comandaApi.obtenerCatalogos();
      setUbicaciones(res.ubicaciones);
      setProductos(res.productos);
      if (res.ubicaciones.length > 0) {
        setUbicacionSeleccionada(res.ubicaciones[0].id);
      }
    } catch (e: any) {
      setMensajeError(e.message || 'Error al cargar catálogos del balneario');
    } finally {
      setCargandoCatalogos(false);
    }
  };

  const agregarProducto = (producto: ProductoDto) => {
    if (producto.disponible_para_venta === false) {
      setMensajeError(`El producto "${producto.nombre}" está pausado por falta de stock.`);
      return;
    }
    setMensajeError(null);
    setItemsCargados((prev) => {
      const idx = prev.findIndex((i) => i.producto_id === producto.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + 1 };
        return copy;
      }
      return [...prev, { producto_id: producto.id, cantidad: 1, observaciones: '' }];
    });
  };

  const modificarCantidad = (productoId: string, delta: number) => {
    setItemsCargados((prev) => {
      return prev
        .map((it) => {
          if (it.producto_id === productoId) {
            const nuevaCant = it.cantidad + delta;
            return nuevaCant > 0 ? { ...it, cantidad: nuevaCant } : null;
          }
          return it;
        })
        .filter(Boolean) as ItemComandaInput[];
    });
  };

  const actualizarObservacion = (productoId: string, obs: string) => {
    setItemsCargados((prev) =>
      prev.map((it) => (it.producto_id === productoId ? { ...it, observaciones: obs } : it))
    );
  };

  const quitarItem = (productoId: string) => {
    setItemsCargados((prev) => prev.filter((it) => it.producto_id !== productoId));
  };

  const totalCalculado = itemsCargados.reduce((acc, it) => {
    const prod = productos.find((p) => p.id === it.producto_id);
    return acc + (prod ? prod.precio_actual * it.cantidad : 0);
  }, 0);

  const ubicacionesFiltradas =
    filtroTipoUbicacion === 'Todas'
      ? ubicaciones
      : ubicaciones.filter((u) => u.tipo === filtroTipoUbicacion);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando) return; // Prevención estricta de doble clic / envío simultáneo

    if (!ubicacionSeleccionada) {
      setMensajeError('Debe seleccionar obligatoriamente una ubicación (mesa, carpa, sombrilla).');
      return;
    }

    if (itemsCargados.length === 0) {
      setMensajeError('Debe agregar al menos un producto a la comanda.');
      return;
    }

    try {
      setEnviando(true);
      setMensajeError(null);

      // Token de idempotencia único por solicitud
      const token = `tok-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const comanda = await comandaApi.crearComanda({
        ubicacion_id: ubicacionSeleccionada,
        items: itemsCargados,
        operador: operadorActual,
        token_idempotencia: token,
      });

      setMensajeExito(`¡Comanda ${comanda.codigo_visible} registrada con éxito para ${comanda.ubicacion_nombre}!`);
      setItemsCargados([]);
      if (onComandaCreada) {
        onComandaCreada();
      }

      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err: any) {
      setMensajeError(err.message || 'Error al persistir la comanda');
    } finally {
      setEnviando(false);
    }
  };

  if (cargandoCatalogos) {
    return (
      <div className="p-8 text-center text-slate-600 font-medium">
        Cargando catálogos de ubicaciones y productos del balneario...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 max-w-7xl mx-auto">
      {/* Columna Izquierda: Ubicación y Catálogo de Productos */}
      <div className="lg:col-span-7 space-y-6">
        {/* Selector de Ubicación */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            📍 1. Ubicación del Balneario
          </h2>

          {/* Filtro por tipo de ubicación */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(['Todas', 'Carpa', 'Sombrilla', 'Mesa', 'Reposera', 'Mostrador'] as const).map((tipo) => (
              <button
                type="button"
                key={tipo}
                onClick={() => setFiltroTipoUbicacion(tipo)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors touch-target ${
                  filtroTipoUbicacion === tipo
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tipo}
              </button>
            ))}
          </div>

          {/* Cuadrícula táctil de ubicaciones */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 max-h-44 overflow-y-auto p-1">
            {ubicacionesFiltradas.map((ub) => (
              <button
                type="button"
                key={ub.id}
                onClick={() => setUbicacionSeleccionada(ub.id)}
                className={`p-3 rounded-xl border text-center font-bold text-sm transition-all min-h-[52px] touch-target flex flex-col items-center justify-center ${
                  ubicacionSeleccionada === ub.id
                    ? 'bg-sky-50 border-sky-600 text-sky-800 ring-2 ring-sky-500'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{ub.nombre}</span>
                <span className="text-[10px] text-slate-500 uppercase font-normal">{ub.tipo}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Catálogo de Productos Gastronómicos */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
            🍽️ 2. Seleccionar Productos
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
            {productos.map((prod) => {
              const estaPausado = prod.disponible_para_venta === false;
              return (
                <button
                  type="button"
                  key={prod.id}
                  disabled={estaPausado}
                  onClick={() => agregarProducto(prod)}
                  className={`p-3.5 border rounded-xl text-left transition-all flex flex-col justify-between min-h-[72px] touch-target ${
                    estaPausado
                      ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                      : 'bg-slate-50 hover:bg-teal-50 border-slate-200 hover:border-teal-400 active:scale-95'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <span className="font-semibold text-slate-800 leading-tight text-sm">
                      {prod.nombre}
                    </span>
                    {estaPausado && (
                      <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded shrink-0">
                        Agotado
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-2 w-full">
                    <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                      {prod.categoria}
                    </span>
                    <span className={`font-bold text-sm ${estaPausado ? 'text-slate-500 line-through' : 'text-teal-700'}`}>
                      ${prod.precio_actual.toLocaleString('es-AR')}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Columna Derecha: Resumen de la Comanda en Curso */}
      <div className="lg:col-span-5">
        <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 flex flex-col h-full justify-between">
          <div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                📋 Pedido en Carga
              </h2>
              {ubicacionSeleccionada && (
                <span className="px-3 py-1 bg-sky-100 text-sky-800 font-bold rounded-lg text-sm">
                  {ubicaciones.find((u) => u.id === ubicacionSeleccionada)?.nombre || ubicacionSeleccionada}
                </span>
              )}
            </div>

            {mensajeError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <span>{mensajeError}</span>
              </div>
            )}

            {mensajeExito && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                <span>{mensajeExito}</span>
              </div>
            )}

            {itemsCargados.length === 0 ? (
              <div className="py-14 text-center text-slate-400">
                <p className="text-sm">No has agregado productos a la comanda.</p>
                <p className="text-xs mt-1 text-slate-400">Toca los artículos del catálogo para sumarlos.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {itemsCargados.map((it) => {
                  const prod = productos.find((p) => p.id === it.producto_id);
                  const subtotal = prod ? prod.precio_actual * it.cantidad : 0;
                  return (
                    <div
                      key={it.producto_id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-800 text-sm">
                          {prod?.nombre || it.producto_id}
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          ${subtotal.toLocaleString('es-AR')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {/* Controles de cantidad táctiles */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => modificarCantidad(it.producto_id, -1)}
                            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-bold active:bg-slate-400"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-bold text-slate-800">
                            {it.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => modificarCantidad(it.producto_id, 1)}
                            className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 font-bold active:bg-slate-400"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Botón eliminar ítem */}
                        <button
                          type="button"
                          onClick={() => quitarItem(it.producto_id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Quitar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Observaciones de preparación */}
                      <input
                        type="text"
                        placeholder="Nota de cocina (ej. sin hielo, término medio)..."
                        value={it.observaciones || ''}
                        onChange={(e) => actualizarObservacion(it.producto_id, e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer de Total y Botón de Confirmación */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-baseline mb-4">
              <span className="text-slate-600 font-medium">Total de Comanda:</span>
              <span className="text-2xl font-black text-slate-900">
                ${totalCalculado.toLocaleString('es-AR')}
              </span>
            </div>

            <button
              type="submit"
              disabled={enviando || itemsCargados.length === 0}
              className={`w-full py-4 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all min-h-[52px] touch-target shadow-md ${
                enviando || itemsCargados.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-teal-500/20 active:scale-[0.99]'
              }`}
            >
              <Send className="w-5 h-5" />
              <span>{enviando ? 'Confirmando pedido...' : 'Confirmar Comanda'}</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
