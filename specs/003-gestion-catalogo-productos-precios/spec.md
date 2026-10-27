# Feature Specification: Gestión de Catálogo de Productos y Precios

**Feature Branch**: `003-gestion-catalogo-productos-precios`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Gestión de Catálogo de Productos y Precios"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consulta y Alta de Productos en el Menú Comercial (Priority: P1)

Como encargado o administrador del balneario, quiero dar de alta nuevos productos gastronómicos asignándoles nombre comercial, categoría, precio de venta vigente y observaciones/descripción, para que el personal de servicio pueda ofrecerlos inmediatamente en las comandas de mesas y carpas.

**Why this priority**: Es el núcleo funcional del menú. Sin la posibilidad de gestionar dinámicamente los productos, el establecimiento queda atado a datos semilla fijos y no puede adaptar su carta gastronómica durante la temporada.

**Independent Test**: Puede probarse de forma independiente accediendo a la sección de catálogo, creando el producto "Tostado Especial de Jamón Crudo" en la categoría "Minutas" con precio de $4.800, y comprobando que aparezca listado de inmediato tanto en la vista administrativa como en el menú de toma de comandas.

**Acceptance Scenarios**:

1. **Given** un operador en el panel de administración de catálogo, **When** registra un nuevo producto con nombre "Limonada con Menta", categoría "Bebidas", precio $2.800 y estado activo, **Then** el sistema almacena el producto y lo muestra disponible para venta en el menú comercial.
2. **Given** un intento de alta con nombre vacío o precio menor o igual a cero, **When** el operador intenta guardar el producto, **Then** el sistema bloquea el guardado e indica el error de validación correspondiente.
3. **Given** un intento de registrar un producto cuyo nombre ya existe en la misma categoría, **When** el operador intenta guardar, **Then** el sistema advierte sobre la duplicación para prevenir nombres confusos en comandería.

---

### User Story 2 - Actualización de Precios con Blindaje Histórico (Priority: P1)

Como administrador del balneario, quiero actualizar el precio vigente de uno o varios productos según la inflación o ajustes de temporada, garantizando taxativamente que ninguna comanda ni cuenta cerrada o pagada en el pasado vea alterado su importe histórico original (Constitución Art. VI).

**Why this priority**: En un balneario los precios se ajustan periódicamente. Es un principio constitucional innegociable que las transacciones pasadas conserven su precio histórico congelado, de modo que modificar un precio hoy nunca descalabre los arqueos ni las comandas de días anteriores.

**Independent Test**: Modificar el precio de "Licuado de Frutilla" de $2.500 a $3.000; verificar que una comanda emitida previamente conserve el ítem a $2.500 y su total intacto, mientras que una comanda nueva emitida a partir de ese momento tome el nuevo precio de $3.000.

**Acceptance Scenarios**:

1. **Given** un producto con precio actual de $2.500 con comandas históricas ya registradas, **When** el administrador actualiza el precio a $3.000, **Then** el sistema guarda el nuevo precio vigente y registra el cambio en el historial de precios con marca temporal y usuario responsable.
2. **Given** comandas preexistentes que contenían el producto a $2.500, **When** se consultan o liquidan dichas comandas, **Then** sus subtotales, totales y saldos permanecen exactamente inalterados.
3. **Given** una nueva comanda creada con posterioridad al cambio de precio, **When** se agrega dicho producto, **Then** el sistema utiliza automáticamente el nuevo valor de $3.000.

---

### User Story 3 - Pausado Rápido de Disponibilidad por Quiebre de Stock (Priority: P2)

Como cajero, mozo o cocinero del balneario, quiero poder marcar un producto como "Sin disponibilidad / Pausado" con un solo toque o clic cuando se acabe el insumo en cocina o barra, para impedir que los mozos continúen agregándolo en nuevas comandas.

**Why this priority**: En los momentos de alta demanda de la temporada de verano es frecuente que se agoten ciertos insumos (por ejemplo, fruta para licuados o carne para minutas). Un botón de pausado rápido previene prometer pedidos que la cocina no puede despachar, evitando cancelaciones posteriores.

**Independent Test**: Marcar "Porción de Rabas" como no disponible; verificar que en el panel de comandería el botón del producto aparezca deshabilitado o con distintivo "Sin Stock", bloqueando su agregado a nuevas comandas.

**Acceptance Scenarios**:

1. **Given** un producto activo con stock agotado ("Licuado de Frutilla"), **When** el operador presiona el botón de pausar disponibilidad, **Then** el producto cambia su estado a no disponible y el menú de toma de comandas lo muestra inhabilitado con etiqueta "Agotado".
2. **Given** un producto previamente pausado cuyos insumos han sido repuestos, **When** el operador pulsa reactivar disponibilidad, **Then** vuelve a quedar disponible de inmediato para nuevas comandas.
3. **Given** una comanda que ya tenía cargado el producto antes de ser pausado, **When** la comanda continúa su flujo, **Then** puede cerrarse o cobrarse normalmente sin verse afectada por el pausado.

---

### User Story 4 - Baja Lógica y Mantenimiento de Categorías (Priority: P2)

Como administrador del balneario, quiero descontinuar productos de la carta y ordenar las categorías del menú (Cafetería, Minutas, Bebidas, Tragos, Heladería) sin eliminar físicamente registros de la base de datos, asegurando la integridad referencial y facilitando la navegación táctil del personal.

**Why this priority**: La rotación de carta entre temporadas requiere retirar productos obsoletos sin romper las claves foráneas de comandas viejas (baja lógica obligatoria, Constitución Art. VI y IX). Además, organizar las categorías agiliza la toma de pedidos en horas pico.

**Independent Test**: Descontinuar un producto que posee ventas registradas; verificar que se oculte de la lista activa del catálogo pero que sus datos sigan existiendo para auditorías y reportes históricos.

**Acceptance Scenarios**:

1. **Given** un producto que ya fue vendido en comandas históricas, **When** el administrador solicita darlo de baja de la carta, **Then** el sistema aplica una baja lógica (`activo = 0`), retirándolo del catálogo de ventas pero preservando su registro y relaciones de base de datos.
2. **Given** una categoría comercial ("Bebidas"), **When** el administrador edita su nombre o su orden de visualización, **Then** todos los productos asociados reflejan la categoría actualizada sin alterar los datos del producto.
3. **Given** un intento de eliminación física (`DELETE`) en la base de datos sobre productos con comandas asociadas, **When** se ejecuta la operación, **Then** el sistema la prohíbe taxativamente por integridad referencial.

---

### Edge Cases

- **Producto dado de baja lógica con comandas abiertas**: Si un producto es desactivado mientras una mesa tiene una comanda abierta con ese producto, el ítem en la comanda existente permanece válido y con su precio pactado; únicamente se bloquea agregar nuevas unidades de ese producto descontinuado.
- **Precio modificado mientras se edita una comanda en borrador**: Si el precio cambia entre el momento en que se abre el formulario y se confirma la comanda, se toma el precio vigente al momento de la confirmación efectiva de apertura.
- **Categoría sin productos activos**: Si una categoría no tiene productos o todos están pausados/dados de baja, la categoría se muestra visible pero vacía o con aviso de "Sin productos disponibles", sin provocar errores de renderizado.
- **Valores decimales en precios**: Los precios admiten dos decimales exactos (centavos) y prohíben valores negativos o nulos.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir el alta de productos gastronómicos requiriendo obligatoriamente: código/identificador único, nombre comercial, categoría y precio de venta unitario (> 0).
- **FR-002**: El sistema DEBE permitir la edición de los datos de un producto (nombre, descripción, categoría y precio).
- **FR-003**: El sistema DEBE garantizar que toda modificación de precio unitario rija exclusivamente para transacciones futuras, manteniendo los precios históricos congelados en todas las comandas, cuentas y auditorías ya registradas (Constitución Art. VI).
- **FR-004**: El sistema DEBE registrar un historial inmutable de cambios de precio (`historial_precios`) con el precio anterior, el precio nuevo, la fecha/hora del cambio y el usuario responsable.
- **FR-005**: El sistema DEBE proveer un control de disponibilidad operativa rápida (`disponible_para_venta: true/false`), permitiendo suspender o reanudar temporalmente la venta de un producto sin desconfigurar su ficha comercial.
- **FR-006**: Los productos marcados como no disponibles (`disponible_para_venta = false`) NO DEBEN poder ser agregados a nuevas comandas mientras dure su suspensión.
- **FR-007**: El sistema DEBE implementar la baja de productos exclusivamente mediante baja lógica (`activo = 0`), prohibiendo la eliminación física (`DELETE`) de registros que posean referencias históricas en comandas o cuentas.
- **FR-008**: El sistema DEBE permitir organizar los productos en categorías predefinidas y configurables (ej. `Cafetería`, `Bebidas`, `Minutas`, `Tragos`, `Heladería`), con orden visual personalizable.
- **FR-009**: El sistema DEBE permitir filtrar y buscar productos en el catálogo por nombre, categoría y estado de disponibilidad.
- **FR-010**: El sistema DEBE persistir las operaciones del catálogo en SQLite local de forma atómica y con modo WAL activo (Constitución Art. III y IV).
- **FR-011**: El sistema DEBE funcionar al 100% de manera autónoma y offline en la estación de trabajo local, sin dependencias de internet ni servicios en la nube (Constitución Art. IV).

---

### Key Entities *(include if feature involves data)*

- **ProductoReferencia**: Representa un artículo gastronómico ofrecido por el balneario.
  - *Atributos*: `id` (texto único, ej: `cafe-cortado`), `nombre` (texto), `categoria` (texto), `precio_actual` (real > 0), `disponible_para_venta` (booleano 0/1), `descripcion` (texto opcional), `activo` (booleano 0/1 para baja lógica), `creado_en` (timestamp), `actualizado_en` (timestamp).
- **CategoriaReferencia**: Clasificación comercial de los productos para navegación ergonómica en pantalla táctil.
  - *Atributos*: `id` (texto único, ej: `cafeteria`), `nombre` (texto), `orden` (entero), `activo` (booleano).
- **HistorialPrecio**: Registro inmutable de auditoría para variaciones de precios.
  - *Atributos*: `id` (entero autoincremental), `producto_id` (texto foráneo), `precio_anterior` (real), `precio_nuevo` (real), `fecha_cambio` (timestamp), `usuario` (texto), `motivo` (texto opcional).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un cambio de precio o pausado de producto se refleja en el menú de comandas en menos de 100 ms tras su confirmación.
- **SC-002**: 100% de consistencia histórica: 0 comandas o cuentas pasadas sufren variaciones en sus totales o subtotales tras una actualización de precios.
- **SC-003**: El pausado rápido de un producto por falta de stock se ejecuta en 2 toques/clics desde la interfaz del establecimiento.
- **SC-004**: 100% de retención de datos: cero productos con comandas asociadas son eliminados físicamente de la base de datos local.
- **SC-005**: 100% de operatividad local autónoma y offline sin requerir conexión a internet.

---

## Assumptions

- **A-001**: El personal autorizado (administrador o encargado) opera la gestión del catálogo desde la misma terminal monopuesto local del balneario.
- **A-002**: Las comandas preexistentes ya congelan el precio unitario en el momento de inserción de cada ítem (`items_comanda.precio_unitario`), lo que garantiza la compatibilidad con el blindaje histórico del catálogo.
- **A-003**: Los precios ingresados se consideran en moneda local (pesos argentinos) e incluyen los impuestos correspondientes para la venta minorista directa.
