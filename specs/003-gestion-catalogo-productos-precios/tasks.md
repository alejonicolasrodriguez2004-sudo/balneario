# Tasks: Gestión de Catálogo de Productos y Precios

**Input**: Design documents from `specs/003-gestion-catalogo-productos-precios/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/tauri-ipc-commands.md`, `quickstart.md`)  
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/`  
**Tests**: Se incluyen pruebas automatizadas de validación de precios, blindaje de importes históricos y baja lógica en cumplimiento de los Artículos II, VI y IX de la Constitución.  
**Organization**: Tareas agrupadas por historia de usuario para permitir implementación y verificación independiente por fases.

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Ejecutable en paralelo (archivos independientes sin dependencias cruzadas pendientes).
- **[Story]**: Historia de usuario a la que pertenece (`[US1]`, `[US2]`, `[US3]`, `[US4]`).
- Cada tarea especifica la ruta de archivo exacta sobre la que opera y las restricciones de validación.

---

## Phase 1: Setup (Infraestructura Compartida)

**Purpose**: Registro de módulos y tipos base para Catálogo, Categorías y Precios.

- [X] T001 [P] Registrar submódulo `catalogo` en `src-tauri/src/domain/mod.rs` y `src-tauri/src/storage/mod.rs`
- [X] T002 [P] Definir tipos TypeScript de catálogo, categorías e historial en `src/types/catalogo.ts`

---

## Phase 2: Foundational (Prerrequisitos Bloqueantes)

**Purpose**: Migraciones DDL en SQLite para `categorias_referencia`, `historial_precios` y actualización aditiva de `productos_referencia`, modelos de dominio y cliente API.

> **CRÍTICO**: No puede comenzar el desarrollo de las historias de usuario hasta completar esta fase fundacional.

- [X] T003 Implementar migración DDL en `src-tauri/src/storage/migrations.rs` para crear tablas `categorias_referencia`, `historial_precios` y añadir columnas `disponible_para_venta`, `descripcion`, `actualizado_en` a `productos_referencia`
- [X] T004 [P] Implementar entidades de dominio `ProductoReferencia`, `CategoriaReferencia` e `HistorialPrecio` en `src-tauri/src/domain/catalogo.rs`
- [X] T005 Implementar estructura base del repositorio transaccional `CatalogoRepository` en `src-tauri/src/storage/catalogo_repo.rs`
- [X] T006 [P] Implementar cliente de servicio frontend `src/services/catalogoApi.ts`

**Checkpoint**: Base fundacional completa. Tablas relacionales, DTOs y modelos de dominio listos.

---

## Phase 3: User Story 1 - Consulta y Alta de Productos en el Menú Comercial (Priority: P1) 🎯 MVP

**Goal**: Permitir consultar el catálogo comercial y dar de alta nuevos productos gastronómicos con validación estricta de precios positivos y unicidad.

**Independent Test**: Acceder a la sección de catálogo, crear el producto "Tostado Especial Crudo" a $4.800 en "Minutas", y verificar que figure inmediatamente disponible para venta en el catálogo y en el menú de comandas.

### Pruebas de User Story 1

- [X] T007 [P] [US1] Escribir prueba unitaria de validación de campos obligatorios, precio positivo y unicidad en `tests/domain_tests/test_catalogo.rs`

### Implementación de User Story 1

- [X] T008 [US1] Implementar métodos `listar_catalogo_completo` y `crear_producto` en `src-tauri/src/storage/catalogo_repo.rs`
- [X] T009 [US1] Implementar comandos Tauri `listar_catalogo_completo` y `crear_producto` en `src-tauri/src/commands/catalogo_commands.rs`
- [X] T010 [US1] Registrar comandos de catálogo en el inicializador de la aplicación en `src-tauri/src/lib.rs`
- [X] T011 [P] [US1] Implementar métodos `listarCatalogoCompleto` y `crearProducto` en `src/services/catalogoApi.ts`
- [X] T012 [US1] Construir componente de vista general de catálogo y listado clasificado en `src/components/CatalogoView.tsx`
- [X] T013 [US1] Construir modal de alta y edición de producto en `src/components/ProductoModal.tsx`
- [X] T014 [US1] Integrar pestaña "Menú y Precios" en la navegación principal `src/App.tsx`

**Checkpoint**: User Story 1 funcional. El balneario puede dar de alta y consultar sus productos de forma dinámica.

---

## Phase 4: User Story 2 - Actualización de Precios con Blindaje Histórico (Priority: P1)

**Goal**: Modificar el precio de venta de un producto registrando la auditoría en `historial_precios` y garantizando que las comandas y cuentas pasadas conserven inalterado su precio original (Constitución Art. VI).

**Independent Test**: Modificar el precio de "Licuado de Frutilla" de $2.500 a $3.000; comprobar que una comanda emitida previamente conserve el ítem a $2.500 y que una comanda nueva tome el nuevo precio de $3.000.

### Pruebas de User Story 2

- [X] T015 [P] [US2] Escribir prueba unitaria de blindaje histórico verificando que la variación de precio no altera comandas preexistentes en `tests/domain_tests/test_catalogo.rs`

### Implementación de User Story 2

- [X] T016 [US2] Implementar método `actualizar_precio_producto` con inserción atómica en `historial_precios` en `src-tauri/src/storage/catalogo_repo.rs`
- [X] T017 [US2] Implementar comando Tauri `actualizar_precio_producto` en `src-tauri/src/commands/catalogo_commands.rs`
- [X] T018 [P] [US2] Implementar método `actualizarPrecioProducto` en `src/services/catalogoApi.ts`
- [X] T019 [US2] Conectar modal de ajuste de precio y botón de ver historial en `src/components/CatalogoView.tsx`

**Checkpoint**: User Story 2 funcional. Precios actualizables con blindaje retrospectivo e historial inmutable.

---

## Phase 5: User Story 3 - Pausado Rápido de Disponibilidad por Quiebre de Stock (Priority: P2)

**Goal**: Pausar o reactivar en 1 clic la disponibilidad de venta de un producto cuando se acabe el insumo en cocina, bloqueando su adición en comandas nuevas.

**Independent Test**: Marcar "Porción de Rabas" como no disponible; verificar que en el panel de comandería aparezca con distintivo "Agotado" y deshabilitado para selección.

### Pruebas de User Story 3

- [X] T020 [P] [US3] Escribir prueba unitaria de pausado de producto y rechazo de adición en comandería en `tests/domain_tests/test_catalogo.rs`

### Implementación de User Story 3

- [X] T021 [US3] Implementar método `cambiar_disponibilidad_producto` en `src-tauri/src/storage/catalogo_repo.rs`
- [X] T022 [US3] Implementar comando Tauri `cambiar_disponibilidad_producto` en `src-tauri/src/commands/catalogo_commands.rs`
- [X] T023 [P] [US3] Implementar método `cambiarDisponibilidadProducto` en `src/services/catalogoApi.ts`
- [X] T024 [US3] Integrar botón de pausado rápido (toggle stock) en cada tarjeta de producto en `src/components/CatalogoView.tsx`
- [X] T025 [US3] Actualizar selector de menú en `src/components/ComandaForm.tsx` para mostrar badge "Agotado" y deshabilitar productos pausados

**Checkpoint**: User Story 3 funcional. El personal puede pausar y reactivar ítems en tiempo real para evitar quiebres de cocina.

---

## Phase 6: User Story 4 - Baja Lógica y Mantenimiento de Categorías (Priority: P2)

**Goal**: Descontinuar productos mediante baja lógica (`activo = 0`) sin eliminación física, y organizar visualmente las categorías del menú.

**Independent Test**: Descontinuar un producto vendido previamente; verificar que se oculte del menú activo pero que la base de datos conserve su registro sin romper claves foráneas de comandas viejas.

### Pruebas de User Story 4

- [X] T026 [P] [US4] Escribir prueba de repositorio verificando que `dar_baja_producto` aplica baja lógica y que SQLite rechaza la eliminación física con `RESTRICT` en `tests/storage_tests/test_catalogo_repo.rs`

### Implementación de User Story 4

- [X] T027 [US4] Implementar métodos `dar_baja_producto`, `listar_categorias` y `guardar_categoria` en `src-tauri/src/storage/catalogo_repo.rs`
- [X] T028 [US4] Implementar comandos Tauri `dar_baja_producto` y `listar_categorias` en `src-tauri/src/commands/catalogo_commands.rs`
- [X] T029 [P] [US4] Implementar métodos `darBajaProducto` y `listarCategorias` en `src/services/catalogoApi.ts`
- [X] T030 [US4] Integrar navegación por pestañas de categorías y botón de baja lógica en `src/components/CatalogoView.tsx`

**Checkpoint**: User Story 4 funcional. Categorías ordenables y bajas lógicas seguras que protegen los reportes históricos.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificación de ergonomía táctil, tiempos de respuesta y escenarios integrales.

- [X] T031 [P] Validar y optimizar el filtrado y búsqueda de productos en tiempo real (< 50 ms) en `src/components/CatalogoView.tsx`
- [X] T032 [P] Ejecutar y verificar los 5 escenarios completos de `specs/003-gestion-catalogo-productos-precios/quickstart.md`
- [X] T033 Ejecutar formateo y análisis estático en `src-tauri/` y `src/`

---

## Dependencies & Execution Order

### Dependencias entre Fases

```text
Phase 1: Setup
   │
   ▼
Phase 2: Foundational (Bloquea todas las historias)
   │
   ├──────────────────────────┬──────────────────────────┐
   ▼                          ▼                          ▼
Phase 3: User Story 1 (P1)  Phase 4: US2 (P1)      Phase 5: US3 (P2)
   │                          │                          │
   └──────────────────────────┴──────────────────────────┤
                                                         ▼
                                                   Phase 6: US4 (P2)
                                                         │
                                                         ▼
                                                   Phase 7: Polish
```

---

## Implementation Strategy

### Estrategia MVP (User Story 1 + User Story 2)

1. Completar **Fase 1: Setup**
2. Completar **Fase 2: Foundational** (imprescindible)
3. Completar **Fase 3: User Story 1** (Alta y consulta de productos)
4. Completar **Fase 4: User Story 2** (Ajuste de precios con blindaje histórico)
5. **Verificación**: Con US1 y US2, el balneario puede mantener actualizada su carta y cambiar precios sin riesgo de afectar comandas pasadas.
