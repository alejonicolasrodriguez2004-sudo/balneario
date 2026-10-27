# Technical Research & Decisions: Gestión de Catálogo de Productos y Precios

**Feature**: `003-gestion-catalogo-productos-precios`  
**Date**: 2026-10-27  
**Status**: Completed  

---

## 1. Decisiones de Arquitectura y Persistencia

### Decisión 1: Evolución del Esquema SQLite para Productos, Categorías e Historial
- **Contexto**: En la Feature 001 se creó la tabla inicial `productos_referencia (id, nombre, categoria, precio_actual, activo)`. Se requiere ahora dar soporte a:
  1. Pausado rápido por falta de stock (`disponible_para_venta`).
  2. Descripción comercial y marca temporal de actualización.
  3. Tabla formal de categorías (`categorias_referencia`) con orden visual personalizable.
  4. Tabla inmutable de auditoría para variaciones de precios (`historial_precios`).
- **Decisión**: Extender `productos_referencia` mediante migración DDL segura (`ALTER TABLE` o recreación controlada de vistas) y añadir las nuevas tablas con claves foráneas e índices B-tree.
- **Justificación**: Mantiene la compatibilidad retrospectiva total con las comandas ya existentes y respeta el Artículo III y IV de la Constitución (100% offline, SQLite en modo WAL).

---

### Decisión 2: Blindaje Constitucional de Precios Históricos (Art. VI)
- **Contexto**: El Artículo VI de la Constitución prohíbe terminantemente la alteración retroactiva de importes pasados por modificaciones en la lista de precios.
- **Mecanismo de blindaje**:
  - Cada comanda almacena una copia inmutable del precio unitario en `items_comanda.precio_unitario` al momento de la inserción.
  - Al actualizar el precio en `productos_referencia.precio_actual`, la base de datos registra la novedad en `historial_precios` y actualiza únicamente el catálogo vigente.
  - Ninguna comanda existente (`items_comanda`, `comandas`) ni cuenta (`cuentas`, `pagos`) es tocada ni recalculada retroactivamente.
  - Nuevas comandas leen el nuevo precio vigente en el momento de su creación.
- **Resultado**: 100% de consistencia contable y auditoría fidedigna.

---

### Decisión 3: Separación entre Disponibilidad Operativa (`disponible_para_venta`) y Baja Lógica (`activo`)
- **Contexto**: Un producto puede agotarse momentáneamente en la cocina durante un turno (ej: se terminaron las frutillas para licuados), pero sigue siendo un producto habitual del balneario. En cambio, un producto descontinuado de la carta se retira de forma definitiva.
- **Decisión**: Modelar dos campos booleanos independientes:
  - `disponible_para_venta` (1 = en carta y con stock, 0 = pausado/agotado temporalmente).
  - `activo` (1 = vigente en el catálogo comercial, 0 = baja lógica / descontinuado).
- **Justificación**: Permite al personal pausar un producto en 1 clic desde la pantalla de caja o cocina sin desconfigurar la ficha comercial del producto ni borrarlo de la base de datos.

---

### Decisión 4: Prohibición de Borrado Físico (`DELETE`) y Soft-Deletion
- **Contexto**: Si se borrase físicamente una fila de `productos_referencia`, se violaría la clave foránea `items_comanda.producto_id`, o se romperían los reportes de ventas históricas.
- **Decisión**: Se mantiene la política constitucional de **baja lógica obligatoria** (`UPDATE productos_referencia SET activo = 0`). Las llaves foráneas en SQLite están configuradas con `ON DELETE RESTRICT` para impedir cualquier intento accidental de eliminación física.
- **Justificación**: Garantiza la trazabilidad contable y la resiliencia operativa en el tiempo (Artículos II, VI y IX).

---

### Decisión 5: Ergonomía de Catálogo en Pantalla Táctil
- **Contexto**: Los mozos y cajeros operan en terminales de mostrador con pantallas táctiles, a menudo bajo condiciones de luz cambiantes (sol, reflejos) y con alta demanda de atención rápida.
- **Decisión**:
  - Categorías presentadas como pestañas visuales con botones grandes e íconos temáticos.
  - Indicador visual claro (badge rojo/amarillo "Agotado") y botón inhabilitado cuando un producto está pausado.
  - Interfaz administrativa con modal ergonómico para cambio de precios y buscador instantáneo en tiempo real (filtro por texto y categoría en $< 50\text{ ms}$).

