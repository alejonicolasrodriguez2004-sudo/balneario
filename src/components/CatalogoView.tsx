import React, { useState, useEffect, useMemo } from 'react';
import {
  CatalogoCompletoDto,
  CategoriaDto,
  HistorialPrecioDto,
  ProductoDto,
  CrearProductoRequest,
  ActualizarProductoRequest,
  ActualizarPrecioRequest,
} from '../types/catalogo';
import { catalogoApi } from '../services/catalogoApi';
import { ProductoModal } from './ProductoModal';
import {
  Plus,
  Search,
  DollarSign,
  History,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Filter,
  X,
  Clock,
  User,
  Coffee,
  UtensilsCrossed,
  GlassWater,
  IceCream,
  Candy,
  Tag,
} from 'lucide-react';

interface CatalogoViewProps {
  operadorActual?: string;
  onCatalogoModificado?: () => void;
}

export const CatalogoView: React.FC<CatalogoViewProps> = ({
  operadorActual = 'admin_playa',
  onCatalogoModificado,
}) => {
  const [catalogo, setCatalogo] = useState<CatalogoCompletoDto>({ categorias: [], productos: [] });
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todas');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  // Estados de modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoModal, setModoModal] = useState<'crear' | 'editar' | 'ajustar_precio'>('crear');
  const [productoSeleccionado, setProductoSeleccionado] = useState<ProductoDto | null>(null);

  // Modal Historial de Precios
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [historialProducto, setHistorialProducto] = useState<ProductoDto | null>(null);
  const [historialItems, setHistorialItems] = useState<HistorialPrecioDto[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Mensajes de notificación
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  useEffect(() => {
    cargarCatalogo();
  }, [mostrarInactivos]);

  const cargarCatalogo = async () => {
    try {
      setCargando(true);
      const res = await catalogoApi.listarCatalogoCompleto(mostrarInactivos);
      setCatalogo(res);
    } catch (e: any) {
      setMensajeError(e.message || 'Error al cargar el catálogo de productos');
    } finally {
      setCargando(false);
    }
  };

  const notificarExito = (msg: string) => {
    setMensajeExito(msg);
    setTimeout(() => setMensajeExito(null), 3500);
    if (onCatalogoModificado) onCatalogoModificado();
  };

  // Filtrado reactivo en memoria (< 50ms)
  const productosFiltrados = useMemo(() => {
    return catalogo.productos.filter((p) => {
      const coincideCat =
        categoriaSeleccionada === 'Todas' ||
        p.categoria.toLowerCase() === categoriaSeleccionada.toLowerCase();

      const coincideBusqueda =
        !busqueda.trim() ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.categoria.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase()));

      return coincideCat && coincideBusqueda;
    });
  }, [catalogo.productos, categoriaSeleccionada, busqueda]);

  // Contadores por categoría
  const conteoPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = { Todas: catalogo.productos.length };
    for (const p of catalogo.productos) {
      mapa[p.categoria] = (mapa[p.categoria] || 0) + 1;
    }
    return mapa;
  }, [catalogo.productos]);

  // Manejadores de acciones
  const handleAbrirCrear = () => {
    setModoModal('crear');
    setProductoSeleccionado(null);
    setModalAbierto(true);
  };

  const handleAbrirEditar = (prod: ProductoDto) => {
    setModoModal('editar');
    setProductoSeleccionado(prod);
    setModalAbierto(true);
  };

  const handleAbrirAjustarPrecio = (prod: ProductoDto) => {
    setModoModal('ajustar_precio');
    setProductoSeleccionado(prod);
    setModalAbierto(true);
  };

  const handleGuardarModal = async (
    modo: 'crear' | 'editar' | 'ajustar_precio',
    data: CrearProductoRequest | ActualizarProductoRequest | ActualizarPrecioRequest
  ) => {
    if (modo === 'crear') {
      const nuevo = await catalogoApi.crearProducto(data as CrearProductoRequest);
      notificarExito(`Producto "${nuevo.nombre}" dado de alta exitosamente a $${nuevo.precio_actual.toLocaleString('es-AR')}`);
    } else if (modo === 'editar') {
      const editado = await catalogoApi.actualizarProducto(data as ActualizarProductoRequest);
      notificarExito(`Producto "${editado.nombre}" actualizado.`);
    } else if (modo === 'ajustar_precio') {
      const precioAct = await catalogoApi.actualizarPrecioProducto(data as ActualizarPrecioRequest);
      notificarExito(`Precio de "${precioAct.nombre}" actualizado a $${precioAct.precio_actual.toLocaleString('es-AR')} (Histórico blindado).`);
    }
    await cargarCatalogo();
  };

  const handleToggleDisponibilidad = async (prod: ProductoDto) => {
    try {
      const nuevoEstado = !prod.disponible_para_venta;
      const res = await catalogoApi.cambiarDisponibilidadProducto({
        producto_id: prod.id,
        disponible: nuevoEstado,
      });
      notificarExito(
        nuevoEstado
          ? `"${res.nombre}" reactivado para la venta.`
          : `"${res.nombre}" pausado por quiebre de stock en cocina.`
      );
      setCatalogo((prev) => ({
        ...prev,
        productos: prev.productos.map((p) => (p.id === res.id ? res : p)),
      }));
    } catch (e: any) {
      setMensajeError(e.message || 'Error al cambiar disponibilidad');
    }
  };

  const handleDarDeBaja = async (prod: ProductoDto) => {
    const confirmar = window.confirm(
      `¿Desea descontinuar "${prod.nombre}" del menú activo?\n\nEl producto quedará inactivo y protegido contra eliminaciones físicas para preservar el historial contable de comandas emitidas (Constitución Art. VI).`
    );
    if (!confirmar) return;

    try {
      const res = await catalogoApi.darBajaProducto({
        producto_id: prod.id,
        operador: operadorActual,
      });
      notificarExito(`"${res.nombre}" descontinuado de la carta comercial.`);
      await cargarCatalogo();
    } catch (e: any) {
      setMensajeError(e.message || 'Error al dar de baja el producto');
    }
  };

  const handleVerHistorial = async (prod: ProductoDto) => {
    try {
      setHistorialProducto(prod);
      setHistorialAbierto(true);
      setCargandoHistorial(true);
      const items = await catalogoApi.obtenerHistorialPrecios(prod.id);
      setHistorialItems(items);
    } catch (e: any) {
      setMensajeError(e.message || 'Error al obtener historial de precios');
    } finally {
      setCargandoHistorial(false);
    }
  };

  const renderIconoCategoria = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'bebidas':
        return <GlassWater className="w-4 h-4 text-sky-500" />;
      case 'minutas':
        return <UtensilsCrossed className="w-4 h-4 text-amber-500" />;
      case 'cafetería':
      case 'cafeteria':
        return <Coffee className="w-4 h-4 text-emerald-500" />;
      case 'postres':
        return <IceCream className="w-4 h-4 text-pink-500" />;
      case 'kiosco':
        return <Candy className="w-4 h-4 text-purple-500" />;
      default:
        return <Tag className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-fade-in">
      {/* Encabezado y Barra de Acciones */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            📖 Carta Comercial y Gestión de Precios
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Administración ágil de productos, pausado por falta de stock y blindaje inmutable de precios históricos (Art. VI).
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100">
            <input
              type="checkbox"
              checked={mostrarInactivos}
              onChange={(e) => setMostrarInactivos(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span>Ver Descontinuados</span>
          </label>

          <button
            type="button"
            onClick={handleAbrirCrear}
            className="flex-1 md:flex-none py-2.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all touch-target"
          >
            <Plus className="w-5 h-5" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center gap-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-semibold">{mensajeExito}</span>
        </div>
      )}

      {mensajeError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-sm flex items-center gap-3 shadow-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span className="font-semibold">{mensajeError}</span>
        </div>
      )}

      {/* Barra de Búsqueda y Pestañas de Categoría */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        {/* Input de Búsqueda */}
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar producto por nombre, ingrediente o categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-medium text-slate-800 bg-slate-50/50"
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Pestañas de Categorías */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setCategoriaSeleccionada('Todas')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all touch-target ${
              categoriaSeleccionada === 'Todas'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Todas</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                categoriaSeleccionada === 'Todas' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {conteoPorCategoria['Todas'] || 0}
            </span>
          </button>

          {catalogo.categorias.map((cat) => {
            const count = conteoPorCategoria[cat.nombre] || 0;
            const activo = categoriaSeleccionada.toLowerCase() === cat.nombre.toLowerCase();
            return (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategoriaSeleccionada(cat.nombre)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all touch-target ${
                  activo
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {renderIconoCategoria(cat.nombre)}
                <span>{cat.nombre}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                    activo ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cuadrícula de Tarjetas de Productos */}
      {cargando ? (
        <div className="p-12 text-center text-slate-500 font-medium">
          Cargando catálogo comercial...
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <p className="font-bold text-slate-700">No se encontraron productos en el menú</p>
          <p className="text-xs text-slate-400">
            Prueba ajustando la búsqueda o da de alta un nuevo producto con el botón superior.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productosFiltrados.map((prod) => {
            const estaPausado = !prod.disponible_para_venta;
            const estaDescontinuado = !prod.activo;

            return (
              <div
                key={prod.id}
                className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
                  estaDescontinuado
                    ? 'border-red-200 bg-red-50/20 opacity-70'
                    : estaPausado
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Encabezado de la tarjeta */}
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {renderIconoCategoria(prod.categoria)}
                        {prod.categoria}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {estaDescontinuado ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-red-100 text-red-800 rounded">
                          Descontinuado
                        </span>
                      ) : estaPausado ? (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                          Agotado / Pausado
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                          Disponible
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">
                    {prod.nombre}
                  </h3>

                  {prod.descripcion && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {prod.descripcion}
                    </p>
                  )}

                  {/* Precio de venta destacado */}
                  <div className="mt-4 flex items-baseline justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-semibold">Precio de Carta:</span>
                    <span className="text-xl font-black text-slate-900">
                      ${prod.precio_actual.toLocaleString('es-AR')}
                    </span>
                  </div>
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="mt-5 pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    {/* Botón de Pausado Rápido (1 toque para cocina) */}
                    {!estaDescontinuado && (
                      <button
                        type="button"
                        onClick={() => handleToggleDisponibilidad(prod)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors touch-target ${
                          estaPausado
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        title={estaPausado ? 'Reanudar disponibilidad' : 'Pausar por falta de stock'}
                      >
                        {estaPausado ? (
                          <>
                            <ToggleLeft className="w-4 h-4 text-amber-700" />
                            <span>Pausado (Agotado)</span>
                          </>
                        ) : (
                          <>
                            <ToggleRight className="w-4 h-4 text-emerald-600" />
                            <span>En Venta</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Botón de Actualizar Precio */}
                    {!estaDescontinuado && (
                      <button
                        type="button"
                        onClick={() => handleAbrirAjustarPrecio(prod)}
                        className="p-2 text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-xl transition-colors"
                        title="Actualizar precio de carta"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                    )}

                    {/* Ver Historial de Precios */}
                    <button
                      type="button"
                      onClick={() => handleVerHistorial(prod)}
                      className="p-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                      title="Ver bitácora de precios pasados"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    {/* Editar ficha */}
                    {!estaDescontinuado && (
                      <button
                        type="button"
                        onClick={() => handleAbrirEditar(prod)}
                        className="p-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                        title="Editar descripción o categoría"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Baja lógica */}
                    {!estaDescontinuado && (
                      <button
                        type="button"
                        onClick={() => handleDarDeBaja(prod)}
                        className="p-2 text-red-500 hover:bg-red-50 border border-red-200 rounded-xl transition-colors"
                        title="Descontinuar de la carta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Creación / Edición / Precio */}
      <ProductoModal
        isOpen={modalAbierto}
        modo={modoModal}
        producto={productoSeleccionado}
        categorias={catalogo.categorias}
        operadorActual={operadorActual}
        onClose={() => setModalAbierto(false)}
        onGuardar={handleGuardarModal}
      />

      {/* Modal Drawer: Historial Inmutable de Precios */}
      {historialAbierto && historialProducto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-teal-600" />
                <h2 className="text-base font-bold text-slate-800">
                  Historial de Precios: {historialProducto.nombre}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setHistorialAbierto(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2">
                <Clock className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  Registro de auditoría inmutable en SQLite. Cada cambio garantiza que las comandas anteriores a esa fecha no sufren alteraciones contables.
                </span>
              </div>

              {cargandoHistorial ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Cargando bitácora de variaciones...
                </div>
              ) : historialItems.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No hay registros de variaciones para este producto.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {historialItems.map((h) => (
                    <div key={h.id} className="relative bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                      <div className="absolute -left-[23px] top-3.5 w-3 h-3 rounded-full bg-teal-600 ring-4 ring-white" />
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-900">
                          ${h.precio_nuevo.toLocaleString('es-AR')}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(h.fecha_cambio).toLocaleString('es-AR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {h.precio_anterior > 0 ? (
                          <span>Precio previo: ${h.precio_anterior.toLocaleString('es-AR')}</span>
                        ) : (
                          <span>Precio inicial de alta</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center pt-1 text-[11px] text-slate-500 border-t border-slate-200/60">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {h.usuario}
                        </span>
                        {h.motivo && <span className="italic">{h.motivo}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setHistorialAbierto(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

