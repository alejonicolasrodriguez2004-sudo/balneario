# Quickstart & Verification Guide: Gestión de Catálogo de Productos y Precios

**Feature**: `003-gestion-catalogo-productos-precios`  
**Purpose**: Guía de prueba y verificación paso a paso de los escenarios de aceptación clave.

---

## Escenario 1: Alta de Nuevo Producto y Visualización Inmediata
1. Acceder al panel de **Catálogo y Precios**.
2. Pulsar **"Nuevo Producto"**.
3. Completar:
   - Nombre: `Limonada con Menta y Jengibre`
   - Categoría: `Bebidas`
   - Precio: `$2.800`
   - Descripción: `Jarra individual con hielo y menta fresca`
4. Confirmar el guardado.
5. **Verificación**: Ir a la pestaña **"Nueva Comanda"** y comprobar que el producto aparezca disponible en el catálogo de Bebidas con su precio de $2.800 y pueda agregarse a una comanda.

---

## Escenario 2: Actualización de Precio y Blindaje de Comandas Pasadas (Constitución Art. VI)
1. Abrir una comanda en Carpa 12 y agregar `1 Café Cortado` (precio actual: `$1.800`).
2. Confirmar la comanda (Total: `$1.800`).
3. Ir al panel de **Catálogo y Precios**, seleccionar `Café Cortado` y modificar su precio a `$2.200` con motivo "Ajuste granos de café".
4. Regresar a la pestaña **"Ver Comandas"** y revisar la comanda emitida en el paso 1.
5. **Verificación Constitucional**: La comanda previa conserva el ítem a `$1.800` y su total en `$1.800`.
6. Crear una **nueva** comanda y agregar `Café Cortado`.
7. **Verificación**: La nueva comanda toma el nuevo valor de `$2.200`.

---

## Escenario 3: Pausado Rápido por Quiebre de Stock (Agotado)
1. En el panel de catálogo o barra rápida, ubicar `Porción de Rabas`.
2. Tocar el interruptor / botón de disponibilidad para marcarlo como **"Pausado / Sin Stock"**.
3. Ir a la pantalla de **"Nueva Comanda"**.
4. **Verificación**: El botón de `Porción de Rabas` aparece con distintivo rojo/ámbar "Agotado" y deshabilitado para el mozo, impidiendo su agregado.

---

## Escenario 4: Reactivación de Disponibilidad tras Reposición
1. Repuesto el insumo en cocina, volver al catálogo y tocar el botón **"Reactivar Disponibilidad"** en `Porción de Rabas`.
2. Volver a **"Nueva Comanda"**.
3. **Verificación**: El producto vuelve a estar habilitado para la venta normal.

---

## Escenario 5: Baja Lógica de Producto con Ventas Históricas
1. Seleccionar un producto de la carta que haya tenido ventas en el día.
2. Pulsar **"Descontinuar de la Carta"** (baja lógica).
3. **Verificación**:
   - El producto desaparece de la vista activa de comandería.
   - La base de datos conserva el registro (`activo = 0`).
   - Las comandas anteriores y los arqueos de caja continúan mostrando el nombre y precio original sin errores referenciales.

