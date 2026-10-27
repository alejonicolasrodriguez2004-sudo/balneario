import React, { useState, useEffect } from 'react';
import { ComandaDto, ProductoDto, ItemComandaInput } from '../types/comanda';
import { comandaApi } from '../services/comandaApi';
import { AnulacionModal } from './AnulacionModal';
import {
  Clock,
  MapPin,
  PlusCircle,
  XCircle,
  CheckCircle,
  AlertOctagon,
  FileText,
  User,
  Plus,
  Minus,
} from 'lucide-react';

interface ComandaDetailProps {
  comandaId: number;
  onActualizado?: () => void;
  operadorActual?: string;
}

export const ComandaDetail: React.FC<ComandaDetailProps> = ({
  comandaId,
  onActualizado,
  operadorActual = 'cajero_turno',
}) => {
  const [comanda, setComanda] = useState<ComandaDto | null>(null);
  const [productos, setProductos] = useState<ProductoDto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de modales
  const [mostrarModalRonda, setMostrarModalRonda] = useState(false);
  const [itemsNuevaRonda, setItemsNuevaRonda] = useState<ItemComandaInput[]>([]);
  const [guardandoRonda, setGuardandoRonda] = useState(false);

  const [modalAnulacionAbierto, setModalAnulacionAbierto] = useState(false);
  const [itemACancelarId, setItemACancelarId] = useState<number | null>(null);

  useEffect(() => {
    cargarDetalle();
  }, [comandaId]);

  const cargarDetalle = async () => {
    try {
      setCargando(true);
      setError(null);
      const [comandaData, catData] = await Promise.all([
        comandaApi.obtenerComanda(comandaId),
        comandaApi.obtenerCatalogos(),
      ]);
      setComanda(comandaData);
      setProductos(catData.productos);
    } catch (e: any) {
      setError(e.message || 'Error al cargar detalle de comanda');
    } finally {
      setCargando(false);
    }
  };

  const handleAgregarProductoRonda = (prod: ProductoDto) => {
    setItemsNuevaRonda((prev) => {
      const idx = prev.findIndex((i) => i.producto_id === prod.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].cantidad += 1;
        return copy;
      }
      return [...prev, { producto_id: prod.id, cantidad: 1, observaciones: '' }];
    });
  };

  const handleModificarCantidadRonda = (prodId: string, delta: number) => {
    setItemsNuevaRonda((prev) =>
      prev
        .map((it) => {
          if (it.producto_id === prodId) {
            const nueva = it.cantidad + delta;
            return nueva > 0 ? { ...it, cantidad: nueva } : null;
          }
          return it;
        })
        .filter(Boolean) as ItemComandaInput[]
    );
  };

  const handleConfirmarNuevaRonda = async () => {
    if (itemsNuevaRonda.length === 0) return;
    try {
      setGuardandoRonda(true);
      const actualizada = await comandaApi.agregarItems({
        comanda_id: comandaId,
        items: itemsNuevaRonda,
        operador: operadorActual,
      });
      setComanda(actualizada);
      setItemsNuevaRonda([]);
      setMostrarModalRonda(false);
      if (onActualizado) onActualizado();
    } catch (e: any) {
      setError(e.message || 'Error al incorporar la nueva ronda de productos');
    } finally {
      setGuardandoRonda(false);
    }
  };

  const handleConfirmarAnulacionComanda = async (motivo: string) => {
    const actualizada = await comandaApi.anularComanda({
      comanda_id: comandaId,
      motivo,
      operador: operadorActual,
    });
    setComanda(actualizada);
    setModalAnulacionAbierto(false);
    if (onActualizado) onActualizado();
  };

  const handleConfirmarCancelacionItem = async (motivo: string) => {
    if (!itemACancelarId) return;
    const actualizada = await comandaApi.cancelarItem({
      comanda_id: comandaId,
      item_id: itemACancelarId,
      motivo,
      operador: operadorActual,
    });
    setComanda(actualizada);
    setItemACancelarId(null);
    if (onActualizado) onActualizado();
  };

  const handleCerrarComanda = async () => {
    if (!window.confirm('¿Deseas cerrar operativamente esta comanda? Ya no se podrán agregar más productos.')) {
      return;
    }
    try {
      const actualizada = await comandaApi.cerrarComanda({
        comanda_id: comandaId,
        operador: operadorActual,
      });
      setComanda(actualizada);
      if (onActualizado) onActualizado();
    } catch (e: any) {
      setError(e.message || 'Error al cerrar comanda');
    }
  };

  if (cargando) {
    return <div className="p-8 text-center text-slate-400">Cargando detalles de la comanda...</div>;
  }

  if (!comanda) {
    return <div className="p-8 text-center text-slate-500">Selecciona una comanda del listado.</div>;
  }

  const esModificable = comanda.estado === 'Abierta';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      {/* Cabecera de la Comanda */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-900">{comanda.codigo_visible}</h2>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full border ${
                  comanda.estado === 'Abierta'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : comanda.estado === 'Cerrada'
                    ? 'bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}
              >
                {comanda.estado}
              </span>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-bold text-slate-800">
                <MapPin className="w-4 h-4 text-teal-600" />
                {comanda.ubicacion_nombre}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-slate-400" />
                {new Date(comanda.creado_en).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-4 h-4 text-slate-400" />
                {comanda.creado_por}
              </span>
            </div>
          </div>

          {/* Acciones principales */}
          <div className="flex items-center gap-2">
            {esModificable && (
              <>
                <button
                  type="button"
                  onClick={() => setMostrarModalRonda(true)}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm touch-target active:scale-95 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Sumar Ronda</span>
                </button>

                <button
                  type="button"
                  onClick={handleCerrarComanda}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 touch-target active:scale-95 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Cerrar Comanda</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalAnulacionAbierto(true)}
                  className="px-3 py-2 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 touch-target active:scale-95 transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Anular</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Motivo de anulación si fue anulada */}
        {comanda.estado === 'Anulada' && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Comanda Anulada: </span>
              {comanda.motivo_anulacion}
              <div className="text-[10px] text-rose-700 mt-1">
                Por {comanda.anulado_por} el {comanda.anulado_en && new Date(comanda.anulado_en).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 text-xs text-center">{error}</div>}

      {/* Lista de Ítems */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Líneas de Consumo Registradas
        </h3>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
          {comanda.items.map((item) => {
            const esCancelado = item.estado === 'Cancelado';
            return (
              <div
                key={item.id}
                className={`p-3.5 flex items-center justify-between gap-4 transition-colors ${
                  esCancelado ? 'bg-slate-100/70 opacity-60' : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${esCancelado ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                      {item.cantidad}x {item.nombre_producto}
                    </span>
                    {esCancelado && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-800 rounded">
                        CANCELADO
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>Unitario histórico: ${item.precio_unitario.toLocaleString('es-AR')}</span>
                    {item.observaciones && (
                      <span className="italic text-teal-700 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {item.observaciones}
                      </span>
                    )}
                  </div>

                  {esCancelado && item.motivo_cancelacion && (
                    <div className="text-[11px] text-rose-700 italic">
                      Motivo baja: {item.motivo_cancelacion}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <span className={`text-base font-black ${esCancelado ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                    ${item.subtotal.toLocaleString('es-AR')}
                  </span>

                  {esModificable && !esCancelado && (
                    <button
                      type="button"
                      onClick={() => setItemACancelarId(item.id || null)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Cancelar este ítem"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Total */}
      <div className="p-5 border-t border-slate-200 bg-slate-50/70 flex justify-between items-center">
        <div>
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
            Importe Total Acumulado
          </span>
          <span className="text-xs text-slate-400">Precios unitarios congelados por comanda</span>
        </div>
        <div className="text-2xl font-black text-slate-900">
          ${comanda.total.toLocaleString('es-AR')}
        </div>
      </div>

      {/* Modal para Sumar Nueva Ronda (User Story 3 / P2) */}
      {mostrarModalRonda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[85vh]">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              ➕ Sumar Nueva Ronda a {comanda.codigo_visible}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Selecciona productos del catálogo para anexarlos a la comanda activa.
            </p>

            {/* Grid de productos */}
            <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1 mb-4 border border-slate-100 rounded-xl">
              {productos.map((prod) => (
                <button
                  type="button"
                  key={prod.id}
                  onClick={() => handleAgregarProductoRonda(prod)}
                  className="p-2.5 bg-slate-50 hover:bg-teal-50 border border-slate-200 rounded-lg text-left text-xs font-semibold flex justify-between items-center touch-target"
                >
                  <span className="truncate pr-1">{prod.nombre}</span>
                  <span className="text-teal-700 font-bold">${prod.precio_actual}</span>
                </button>
              ))}
            </div>

            {/* Ítems agregados a la ronda */}
            <div className="flex-1 overflow-y-auto mb-4 border-t border-slate-100 pt-3 space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase">Productos a anexar:</span>
              {itemsNuevaRonda.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No has seleccionado ítems para la ronda.</p>
              ) : (
                itemsNuevaRonda.map((it) => {
                  const p = productos.find((x) => x.id === it.producto_id);
                  return (
                    <div key={it.producto_id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-xs">
                      <span>{p?.nombre}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleModificarCantidadRonda(it.producto_id, -1)}
                          className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold">{it.cantidad}</span>
                        <button
                          type="button"
                          onClick={() => handleModificarCantidadRonda(it.producto_id, 1)}
                          className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMostrarModalRonda(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={guardandoRonda || itemsNuevaRonda.length === 0}
                onClick={handleConfirmarNuevaRonda}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs disabled:bg-slate-200 disabled:text-slate-400"
              >
                {guardandoRonda ? 'Guardando...' : 'Confirmar Adición'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Anulación de Comanda Completa */}
      <AnulacionModal
        isOpen={modalAnulacionAbierto}
        titulo={`Anular Comanda ${comanda.codigo_visible}`}
        subtitulo={`Ubicación: ${comanda.ubicacion_nombre} - Total: $${comanda.total.toLocaleString('es-AR')}`}
        onConfirmar={handleConfirmarAnulacionComanda}
        onCancelar={() => setModalAnulacionAbierto(false)}
        accionTexto="Confirmar Anulación de Comanda"
      />

      {/* Modal de Cancelación de Ítem Individual */}
      <AnulacionModal
        isOpen={itemACancelarId !== null}
        titulo="Cancelar Ítem de Comanda"
        subtitulo="El ítem será cancelado de forma lógica y restado del total de la comanda con auditoría."
        onConfirmar={handleConfirmarCancelacionItem}
        onCancelar={() => setItemACancelarId(null)}
        accionTexto="Confirmar Cancelación de Ítem"
      />
    </div>
  );
};

