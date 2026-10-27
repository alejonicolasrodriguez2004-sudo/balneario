# Tasks: Gestión de Comandas

**Input**: Design documents from `specs/001-gestion-comandas/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/tauri-ipc-commands.md`, `quickstart.md`)  
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/`  
**Tests**: Se incluyen pruebas automatizadas de dominio, persistencia y resiliencia en cumplimiento de los Artículos II y IX de la Constitución.  
**Organization**: Tareas agrupadas por historia de usuario para permitir implementación y verificación independiente por fases.

## Format: `- [X] [ID] [P?] [Story?] Description with file path`

- **[P]**: Ejecutable en paralelo (archivos independientes sin dependencias cruzadas pendientes).
- **[Story]**: Historia de usuario a la que pertenece (`[US1]`, `[US2]`, `[US3]`, `[US4]`, `[US5]`).
- Cada tarea especifica la ruta de archivo exacta sobre la que opera y las restricciones de validación.

---

## Phase 1: Setup (Infraestructura Compartida)

**Purpose**: Inicialización del proyecto de escritorio Tauri 2.x con frontend en React, TypeScript y TailwindCSS.

- [X] T001 Configurar la estructura base del proyecto de escritorio Tauri 2.x en `src-tauri/` y frontend en `src/` conforme al plan de implementación
- [X] T002 [P] Configurar dependencias de backend en `src-tauri/Cargo.toml` (`tauri` v2, `rusqlite` con feature `bundled`, `serde`, `serde_json`, `thiserror`, `uuid`, `chrono`)
- [X] T003 [P] Configurar dependencias de interfaz en `package.json` (`react`, `react-dom`, `@tauri-apps/api`, `lucide-react`, `tailwindcss`, `vitest`, `@testing-library/react`)
- [X] T004 [P] Configurar estilos globales de alto contraste y legibilidad para luz solar exterior en `src/index.css` y `tailwind.config.js`

---

## Phase 2: Foundational (Prerrequisitos Bloqueantes)

**Purpose**: Infraestructura de base de datos local SQLite con modo WAL, DDL inicial, tipos TypeScript y adaptador base IPC.

> **CRÍTICO**: No puede comenzar el desarrollo de las historias de usuario hasta completar esta fase fundacional.

- [X] T005 Implementar gestor de conexión SQLite con modo WAL y claves foráneas activas (`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL;`) en `src-tauri/src/storage/db.rs`
- [X] T006 Implementar ejecutor de migraciones DDL creando tablas `ubicaciones_referencia`, `productos_referencia`, `comandas`, `items_comanda` y `auditoria_comandas` con índices en `src-tauri/src/storage/migrations.rs`
- [X] T007 [P] Implementar repositorio y seed inicial para catálogos de referencia (`ubicaciones_referencia`, `productos_referencia`) en `src-tauri/src/storage/reference_repo.rs`
- [X] T008 [P] Definir tipos TypeScript, DTOs y wrappers de respuesta `ApiResponse<T>` espejados de los contratos IPC en `src/types/comanda.ts`
- [X] T009 [P] Definir tipos canónicos de error de dominio (`DomainError`, `ErrorDto`) y códigos de error estándar en `src-tauri/src/domain/errors.rs`
- [X] T010 Implementar cliente base de invocación IPC tipado para Tauri en `src/services/apiClient.ts`

**Checkpoint**: Base fundacional completa. La persistencia transaccional y los contratos base están listos.

---

## Phase 3: User Story 1 - Creación y Registro Inicial de Comanda (Priority: P1) 🎯 MVP

**Goal**: Permitir al empleado registrar un pedido gastronómico asociándolo a una ubicación física con productos, cantidades (>0), notas de preparación y congelamiento de precios históricos.

**Independent Test**: Registrar una comanda en "Carpa 12" con 2 ítems y validar que se guarde en estado `Abierta`, con identificador correlativo único, total calculado y precios unitarios congelados.

### Pruebas de User Story 1

- [X] T011 [P] [US1] Escribir prueba unitaria de creación de comanda verificando rechazo de comanda vacía, cantidades no positivas (`cantidad > 0`) y cálculo de subtotales en `tests/domain_tests/test_crear_comanda.rs`

### Implementación de User Story 1

- [X] T012 [P] [US1] Implementar entidades de dominio `Comanda` e `ItemComanda` con validación de campos obligatorios e inmutabilidad en `src-tauri/src/domain/entities.rs`
- [X] T013 [US1] Implementar persistencia atómica de nueva comanda y verificación de token de idempotencia en `src-tauri/src/storage/comanda_repo.rs`
- [X] T014 [US1] Implementar manejador de comandos Tauri `crear_comanda` y `obtener_catalogos_referencia` en `src-tauri/src/commands/comanda_commands.rs`
- [X] T015 [US1] Registrar comandos IPC de creación en el constructor de la aplicación Tauri en `src-tauri/src/lib.rs`
- [X] T016 [P] [US1] Implementar métodos `crearComanda` y `obtenerCatalogosReferencia` en el servicio frontend `src/services/comandaApi.ts`
- [X] T017 [US1] Construir selector visual de ubicaciones (`Carpa`, `Sombrilla`, `Mesa`, `Reposera`, `Mostrador`) y selector táctil de productos (mínimo 48×48px) en `src/components/ComandaForm.tsx`
- [X] T018 [US1] Implementar bloqueo de interfaz ante doble clic y validación de campos requeridos en `src/components/ComandaForm.tsx`
- [X] T019 [US1] Integrar vista de formulario de comanda en el contenedor principal `src/App.tsx`

**Checkpoint**: User Story 1 funcional y testeable de manera autónoma (MVP alcanzado).

---

## Phase 4: User Story 2 - Consulta y Filtrado de Comandas Existentes (Priority: P1)

**Goal**: Consultar y listar comandas activas e históricas con filtros por estado (`Abierta`, `Cerrada`, `Anulada`) y ubicación, visualizando el desglose detallado de ítems.

**Independent Test**: Cargar un conjunto de comandas, aplicar filtros por estado y ubicación, y abrir el detalle para comprobar el desglose exacto de productos y subtotales.

### Pruebas de User Story 2

- [X] T020 [P] [US2] Escribir prueba de repositorio para filtrado de comandas por estado y búsqueda por ubicación en `tests/storage_tests/test_listar_comandas.rs`

### Implementación de User Story 2

- [X] T021 [US2] Implementar consultas de listado con filtros y obtención de comanda detallada en `src-tauri/src/storage/comanda_repo.rs`
- [X] T022 [US2] Implementar comandos Tauri `listar_comandas` y `obtener_comanda` en `src-tauri/src/commands/comanda_commands.rs`
- [X] T023 [P] [US2] Implementar métodos `listarComandas` y `obtenerComanda` en el servicio frontend `src/services/comandaApi.ts`
- [X] T024 [US2] Construir tabla/cuadrícula de comandas con badges de estado y selector de filtros en `src/components/ComandaList.tsx`
- [X] T025 [US2] Construir panel de detalle de comanda con desglose de ítems, precios congelados y notas en `src/components/ComandaDetail.tsx`
- [X] T026 [US2] Integrar navegación fluida entre listado y vista detallada en `src/App.tsx`

**Checkpoint**: User Stories 1 y 2 operativas e integradas.

---

## Phase 5: User Story 3 - Incorporación Incremental de Productos a Comanda Abierta (Priority: P2)

**Goal**: Agregar nuevos productos a una comanda ya abierta, recalculando el total acumulado y registrando la fecha/hora de adición sin alterar los ítems anteriores.

**Independent Test**: Abrir una comanda existente en estado `Abierta`, sumar una nueva ronda de productos y verificar que el total se incremente y los ítems previos queden intactos.

### Pruebas de User Story 3

- [X] T027 [P] [US3] Escribir prueba unitaria de adición incremental comprobando recálculo de total y rechazo si la comanda está `Cerrada` o `Anulada` en `tests/domain_tests/test_adicion_items.rs`

### Implementación de User Story 3

- [X] T028 [US3] Implementar método de dominio `agregar_items` e inserción atómica de nuevas filas en `src-tauri/src/storage/comanda_repo.rs`
- [X] T029 [US3] Implementar comando Tauri `agregar_items_comanda` en `src-tauri/src/commands/comanda_commands.rs`
- [X] T030 [P] [US3] Implementar método `agregarItemsComanda` en el servicio frontend `src/services/comandaApi.ts`
- [X] T031 [US3] Construir modal/panel de adición de nueva ronda de ítems dentro de `src/components/ComandaDetail.tsx`

**Checkpoint**: Adición incremental de pedidos en curso completada y verificable.

---

## Phase 6: User Story 4 - Modificación y Anulación con Trazabilidad Obligatoria (Priority: P2)

**Goal**: Permitir anular una comanda completa o cancelar un ítem individual exigiendo motivo de justificación obligatorio, registrando baja lógica (*soft-cancel*) y auditoría inmutable.

**Independent Test**: Intentar anular sin motivo (debe bloquearse); luego anular con justificación y comprobar que el estado sea `Anulada`, se guarde el motivo en `auditoria_comandas` y no se borren registros físicos.

### Pruebas de User Story 4

- [X] T032 [P] [US4] Escribir prueba unitaria que verifique rechazo de anulación sin motivo y preservación de registros históricos (*soft-cancel*) en `tests/domain_tests/test_anulacion.rs`

### Implementación de User Story 4

- [X] T033 [US4] Implementar máquina de estados y transiciones (`Abierta` -> `Anulada`, `Abierta` -> `Cerrada`) y cancelación de ítems en `src-tauri/src/domain/state.rs`
- [X] T034 [US4] Implementar registro de eventos de auditoría (`tipo_evento IN ('ANULACION_COMANDA', 'CANCELACION_ITEM')`) en `src-tauri/src/storage/comanda_repo.rs`
- [X] T035 [US4] Implementar comandos Tauri `anular_comanda` y `cancelar_item_comanda` en `src-tauri/src/commands/comanda_commands.rs`
- [X] T036 [P] [US4] Implementar métodos `anularComanda` y `cancelarItemComanda` en el servicio frontend `src/services/comandaApi.ts`
- [X] T037 [US4] Construir modal de anulación con validación de motivo obligatorio (mínimo 4 caracteres) en `src/components/AnulacionModal.tsx`
- [X] T038 [US4] Conectar acciones de anulación de comanda y cancelación de ítem en `src/components/ComandaDetail.tsx`

**Checkpoint**: Trazabilidad y auditoría rigurosa de anulaciones completada conforme a la Constitución.

---

## Phase 7: User Story 5 - Resiliencia ante Cierres Inesperados y Fallos de Energía (Priority: P3)

**Goal**: Garantizar que ante un corte abrupto de energía eléctrica o apagado repentino de la máquina, ninguna comanda confirmada se pierda ni quede corrupta.

**Independent Test**: Simular un cierre forzado del proceso tras confirmar una comanda; reiniciar la aplicación y validar que la base de datos local SQLite WAL recupere el estado consistente.

### Pruebas e Implementación de User Story 5

- [X] T039 [US5] Escribir prueba automatizada de consistencia y recuperación de SQLite WAL ante cierres forzados en `tests/storage_tests/test_resiliencia_wal.rs`
- [X] T040 [US5] Implementar rutina de verificación de integridad (`PRAGMA integrity_check;`) en el arranque de la base de datos en `src-tauri/src/storage/db.rs`
- [X] T041 [US5] Implementar pantalla de diagnóstico de integridad y salud en el arranque en `src/components/StartupHealthCheck.tsx`

**Checkpoint**: Resiliencia y robustez offline-first validada.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verificación integral, pruebas de extremo a extremo y limpieza de código.

- [X] T042 [P] Verificar y blindar la inmutabilidad de precios históricos frente a modificaciones del catálogo en `src-tauri/src/storage/comanda_repo.rs`
- [X] T043 [P] Ejecutar y validar los 5 escenarios completos de la guía de validación rápida en `specs/001-gestion-comandas/quickstart.md`
- [X] T044 Ejecutar formateo, análisis estático y linter (`cargo clippy`, `cargo fmt`, `npm run lint`) en `src-tauri/` y `src/`

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
Phase 3: User Story 1 (P1)  Phase 4: US2 (P1)      Phase 7: US5 (P3)
   │                          │                          │
   ▼                          │                          │
Phase 5: User Story 3 (P2)    │                          │
   │                          │                          │
   ▼                          │                          │
Phase 6: User Story 4 (P2)────┴──────────────────────────┘
   │
   ▼
Phase 8: Polish & Cross-Cutting
```

- **Setup (Fase 1)**: Sin dependencias previas.
- **Foundational (Fase 2)**: Depende de Setup. **Bloquea** todas las historias de usuario.
- **User Story 1 (P1)**: Depende de Foundational. Establece el modelo de creación (MVP).
- **User Story 2 (P1)**: Depende de Foundational (puede ejecutarse en paralelo o justo después de US1).
- **User Story 3 (P2)**: Depende de US1 (requiere que exista una comanda para añadirle ítems).
- **User Story 4 (P2)**: Depende de US1 (requiere comanda para anular/cancelar ítems).
- **User Story 5 (P3)**: Depende de la base de datos de Foundational y US1.
- **Polish (Fase 8)**: Depende de la finalización de las historias de usuario.

---

## Parallel Opportunities

- **Dentro de Setup**: T002, T003 y T004 pueden ejecutarse en paralelo.
- **Dentro de Foundational**: T007, T008 y T009 son archivos independientes y pueden desarrollarse en paralelo.
- **Dentro de cada historia**: Las pruebas unitarias (`[P]`), modelos y clientes frontend pueden desarrollarse en paralelo antes de la integración visual.

---

## Implementation Strategy

### Estrategia MVP (Foco en User Story 1)

1. Completar **Fase 1: Setup**
2. Completar **Fase 2: Foundational** (imprescindible)
3. Completar **Fase 3: User Story 1**
4. **Verificación y validación**: Ejecutar Escenario 1 de `quickstart.md`. En este punto el balneario ya puede registrar comandas operativas en mostrador o carpas.

### Entrega Incremental

1. **Incremento 1 (MVP)**: Setup + Foundational + User Story 1 → Registro de pedidos operativo.
2. **Incremento 2**: User Story 2 → Consulta, filtrado y detalle de comandas activas en pantalla.
3. **Incremento 3**: User Story 3 + User Story 4 → Rondas adicionales y gestión auditada de cancelaciones y bajas.
4. **Incremento 4**: User Story 5 + Polish → Resiliencia ante cortes de luz y validación final de temporada.
