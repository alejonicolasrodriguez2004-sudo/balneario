import React, { useState } from 'react';
import { ComandaForm } from './components/ComandaForm';
import { ComandaList } from './components/ComandaList';
import { ComandaDetail } from './components/ComandaDetail';
import { CuentasView } from './components/CuentasView';
import { CatalogoView } from './components/CatalogoView';
import { TurnosView } from './components/TurnosView';
import { StartupHealthCheck } from './components/StartupHealthCheck';
import { PlusCircle, ListFilter, UtensilsCrossed, Receipt, BookOpen, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [vistaActiva, setVistaActiva] = useState<'nueva' | 'consultar' | 'cuentas' | 'catalogo' | 'turnos'>('turnos');
  const [comandaSeleccionadaId, setComandaSeleccionadaId] = useState<number | null>(null);
  const [refrescoListado, setRefrescoListado] = useState(0);
  const operadorActual = 'operador_playa_1';

  const handleComandaCreada = () => {
    setRefrescoListado((prev) => prev + 1);
    setVistaActiva('consultar');
  };

  const handleSeleccionarComanda = (id: number) => {
    setComandaSeleccionadaId(id);
    setVistaActiva('consultar');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-800">
      {/* Diagnóstico y Salud Local SQLite WAL */}
      <StartupHealthCheck />

      {/* Barra de Navegación Principal */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <UtensilsCrossed className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 leading-tight">
                Balneario Comandas
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Gestión Operativa Gastronómica • Temporada
              </p>
            </div>
          </div>

          {/* Selector de Pestañas / Vistas */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setVistaActiva('turnos')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all touch-target ${
                vistaActiva === 'turnos'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Turnos y Caja</span>
            </button>

            <button
              type="button"
              onClick={() => setVistaActiva('nueva')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all touch-target ${
                vistaActiva === 'nueva'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nueva Comanda</span>
            </button>

            <button
              type="button"
              onClick={() => setVistaActiva('consultar')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all touch-target ${
                vistaActiva === 'consultar'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Ver Comandas</span>
            </button>

            <button
              type="button"
              onClick={() => setVistaActiva('cuentas')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all touch-target ${
                vistaActiva === 'cuentas'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Cuentas y Cobros</span>
            </button>

            <button
              type="button"
              onClick={() => setVistaActiva('catalogo')}
              className={`px-3.5 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all touch-target ${
                vistaActiva === 'catalogo'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Menú y Precios</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col">
        {vistaActiva === 'turnos' ? (
          <TurnosView operadorActual={operadorActual} />
        ) : vistaActiva === 'nueva' ? (
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-black text-slate-900">Tomar Nuevo Pedido</h2>
              <p className="text-xs text-slate-500">
                Selecciona la mesa, carpa o sombrilla y agrega los productos solicitados.
              </p>
            </div>
            <ComandaForm onComandaCreada={handleComandaCreada} operadorActual={operadorActual} />
          </div>
        ) : vistaActiva === 'consultar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px]">
            {/* Listado lateral */}
            <div className="lg:col-span-5 h-full">
              <ComandaList
                key={refrescoListado}
                onSeleccionarComanda={handleSeleccionarComanda}
                comandaSeleccionadaId={comandaSeleccionadaId}
              />
            </div>

            {/* Detalle ampliado */}
            <div className="lg:col-span-7 h-full">
              {comandaSeleccionadaId ? (
                <ComandaDetail
                  comandaId={comandaSeleccionadaId}
                  onActualizado={() => setRefrescoListado((p) => p + 1)}
                  operadorActual={operadorActual}
                />
              ) : (
                <div className="h-full bg-white rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <ListFilter className="w-12 h-12 mb-3 text-slate-300" />
                  <p className="font-bold text-slate-700">Ninguna comanda seleccionada</p>
                  <p className="text-xs mt-1 text-slate-400">
                    Elige una comanda del listado para inspeccionar sus productos, agregar rondas o anularla.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : vistaActiva === 'cuentas' ? (
          <CuentasView operadorActual={operadorActual} />
        ) : (
          <CatalogoView
            operadorActual={operadorActual}
            onCatalogoModificado={() => setRefrescoListado((p) => p + 1)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
