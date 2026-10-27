import React, { useState, useEffect } from 'react';
import {
  CategoriaDto,
  ProductoDto,
  CrearProductoRequest,
  ActualizarProductoRequest,
  ActualizarPrecioRequest,
} from '../types/catalogo';
import { X, Check, AlertCircle, DollarSign, Tag, Info } from 'lucide-react';

interface ProductoModalProps {
  modo: 'crear' | 'editar' | 'ajustar_precio';
  producto?: ProductoDto | null;
  categorias: CategoriaDto[];
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (
    modo: 'crear' | 'editar' | 'ajustar_precio',
    data: CrearProductoRequest | ActualizarProductoRequest | ActualizarPrecioRequest
  ) => Promise<void>;
  operadorActual?: string;
}

export const ProductoModal: React.FC<ProductoModalProps> = ({
  modo,
  producto,
  categorias,
  isOpen,
  onClose,
  onGuardar,
  operadorActual = 'admin_playa',
}) => {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [precio, setPrecio] = useState<string>('');
  const [descripcion, setDescripcion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (producto && modo === 'editar') {
        setNombre(producto.nombre);
        setCategoria(producto.categoria);
        setDescripcion(producto.descripcion || '');
      } else if (producto && modo === 'ajustar_precio') {
        setPrecio(producto.precio_actual.toString());
        setMotivo('');
      } else {
        // Modo crear
        setNombre('');
        setCategoria(categorias.length > 0 ? categorias[0].nombre : 'Minutas');
        setPrecio('');
        setDescripcion('');
        setMotivo('');
      }
    }
  }, [isOpen, modo, producto, categorias]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (modo === 'crear') {
      if (!nombre.trim()) {
        setError('El nombre del producto es obligatorio.');
        return;
      }
      if (!categoria.trim()) {
        setError('Debe seleccionar una categoría.');
        return;
      }
      const numPrecio = parseFloat(precio);
      if (isNaN(numPrecio) || numPrecio <= 0) {
        setError('El precio unitario debe ser estrictamente mayor a $0.');
        return;
      }

      try {
        setGuardando(true);
        await onGuardar('crear', {
          nombre: nombre.trim(),
          categoria: categoria.trim(),
          precio_actual: numPrecio,
          descripcion: descripcion.trim() || null,
          operador: operadorActual,
        });
        onClose();
      } catch (err: any) {
        setError(err.message || 'Error al dar de alta el producto.');
      } finally {
        setGuardando(false);
      }
    } else if (modo === 'editar' && producto) {
      if (!nombre.trim()) {
        setError('El nombre del producto es obligatorio.');
        return;
      }
      if (!categoria.trim()) {
        setError('Debe seleccionar una categoría.');
        return;
      }

      try {
        setGuardando(true);
        await onGuardar('editar', {
          id: producto.id,
          nombre: nombre.trim(),
          categoria: categoria.trim(),
          descripcion: descripcion.trim() || null,
          operador: operadorActual,
        });
        onClose();
      } catch (err: any) {
        setError(err.message || 'Error al actualizar el producto.');
      } finally {
        setGuardando(false);
      }
    } else if (modo === 'ajustar_precio' && producto) {
      const numPrecio = parseFloat(precio);
      if (isNaN(numPrecio) || numPrecio <= 0) {
        setError('El nuevo precio debe ser estrictamente mayor a $0.');
        return;
      }
      if (numPrecio === producto.precio_actual) {
        setError('El nuevo precio debe ser diferente al precio vigente.');
        return;
      }

      try {
        setGuardando(true);
        await onGuardar('ajustar_precio', {
          producto_id: producto.id,
          nuevo_precio: numPrecio,
          motivo: motivo.trim() || 'Ajuste comercial de carta',
          operador: operadorActual,
        });
        onClose();
      } catch (err: any) {
        setError(err.message || 'Error al actualizar el precio.');
      } finally {
        setGuardando(false);
      }
    }
  };

  const getTitulo = () => {
    switch (modo) {
      case 'crear':
        return '✨ Nuevo Producto Comercial';
      case 'editar':
        return `✏️ Editar Producto: ${producto?.nombre}`;
      case 'ajustar_precio':
        return `💵 Actualizar Precio: ${producto?.nombre}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Encabezado */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">{getTitulo()}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {modo === 'ajustar_precio' && producto && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Blindaje Histórico Inmutable (Constitución Art. VI)</span>
              </div>
              <p className="text-slate-600">
                El precio vigente cambiará de{' '}
                <strong className="text-slate-900">${producto.precio_actual.toLocaleString('es-AR')}</strong> al nuevo valor solo para futuras comandas. Las comandas y cuentas pasadas conservan su precio original intacto.
              </p>
            </div>
          )}

          {modo !== 'ajustar_precio' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Comercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Tostado Especial Crudo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Categoría *
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-800 text-sm bg-white"
                >
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.nombre}>
                      {cat.nombre}
                    </option>
                  ))}
                  {categorias.every((c) => c.nombre !== 'Otras') && (
                    <option value="Minutas">Minutas</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción o Notas de Cocina (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Pan árabe tostado con jamón crudo y queso de campo"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs text-slate-800"
                />
              </div>
            </>
          )}

          {modo !== 'editar' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {modo === 'ajustar_precio' ? 'Nuevo Precio de Venta ($ ARS) *' : 'Precio Inicial ($ ARS) *'}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="0.00"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-slate-900 text-base"
                />
              </div>
            </div>
          )}

          {modo === 'ajustar_precio' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Motivo del Cambio (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Ajuste inflacionario quincena enero"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm text-slate-800"
              />
            </div>
          )}

          {/* Botones de acción */}
          <div className="pt-4 border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>{guardando ? 'Guardando...' : 'Confirmar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

