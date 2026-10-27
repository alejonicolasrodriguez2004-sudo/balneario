# Tasks: Gestión de Turnos de Caja y Arqueo Ciego

**Input**: Design documents from `specs/004-gestion-turnos-arqueo-caja/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/tauri-ipc-commands.md`, `quickstart.md`)  
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/`  
**Tests**: Pruebas automatizadas de validación de saldos de gaveta, exclusión de turno único, arqueo ciego inmutable y auditoría de diferencias (Constitución Art. IV y VI).  
**Organization**: Tareas agrupadas por historia de usuario para permitir desarrollo e integración incremental por fases.

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Ejecutable en paralelo (archivos independientes sin dependencias cruzadas bloqueantes).
- **[Story]**: Historia de usuario a la que pertenece (`[US1]`, `[US2]`, `[US3]`, `[US4]`).
- Cada tarea especifica la ruta de archivo exacta sobre la que opera y las restricciones de validación.

---

## Phase 1: Setup (Infraestructura Compartida)

**Purpose**: Registro de módulos y tipos base para Turnos, Arqueos y Sangrías.

- [X] T001 [P] Registrar submódulo `turnos` en `src-tauri/src/domain/mod.rs` y `turnos_repo` en `src-tauri/src/storage/mod.rs`
- [X] T002 [P] Definir tipos TypeScript de turnos, arqueos, retiros y DTOs en `src/types/turnos.ts`

---

## Phase 2: Foundational (Prerrequisitos Bloqueantes)

**Purpose**: Migraciones DDL en SQLite para `turnos_caja` (con índice único parcial), `retiros_caja`, `arqueos_cierre`, adición de `turno_id` en `pagos`, modelos de dominio y cliente API.

> **CRÍTICO**: No puede comenzar el desarrollo de las historias de usuario hasta completar esta fase fundacional.

- [X] T003 Implementar migración DDL en `src-tauri/src/storage/migrations.rs` para crear tablas `turnos_caja`, `retiros_caja`, `arqueos_cierre`, índice parcial `idx_un_solo_turno_abierto` y añadir columna `turno_id` a `pagos`
- [X] T004 [P] Implementar entidades de dominio `TurnoCaja`, `RetiroCaja`, `ArqueoCierre` y errores de dominio (`TurnoYaAbierto`, `SaldoInsuficienteEnGaveta`, `JustificacionRequerida`) en `src-tauri/src/domain/turnos.rs` y `src-tauri/src/domain/errors.rs`
- [X] T005 Implementar estructura base del repositorio transaccional `TurnosRepository` con cálculo de efectivo disponible en gaveta en `src-tauri/src/storage/turnos_repo.rs`
- [X] T006 [P] Implementar cliente de servicio frontend `src/services/turnosApi.ts` y ampliar mock en `src/services/apiClient.ts`

**Checkpoint**: Base fundacional completa. Tablas relacionales, DTOs y modelos de dominio listos.

---

## Phase 3: User Story 1 - Apertura de Turno con Fondo Inicial de Cambio (Priority: P1) 🎯 MVP

**Goal**: Permitir abrir el turno de caja declarando el fondo de cambio en efectivo, garantizando la exclusión de doble turno abierto simultáneo.

**Independent Test**: Iniciar un turno con fondo inicial de $25.000 a nombre de "cajero_playa_1" y verificar que la terminal lo reconozca como activo, mostrando el saldo inicial en gaveta y bloqueando un segundo intento de apertura.

### Pruebas de User Story 1

- [X] T007 [P] [US1] Escribir prueba unitaria de validación de apertura, fondo inicial $\ge 0$ y rechazo de apertura múltiple en `tests/domain_tests/test_turnos.rs`

### Implementación de User Story 1

- [X] T008 [US1] Implementar métodos `abrir_turno` y `obtener_turno_activo` en `src-tauri/src/storage/turnos_repo.rs`
- [X] T009 [US1] Modificar `src-tauri/src/storage/cuentas_repo.rs` para vincular automáticamente cada pago registrado al `turno_id` activo
- [X] T010 [US1] Implementar comandos Tauri `abrir_turno_caja` y `obtener_estado_turno_actual` en `src-tauri/src/commands/turnos_commands.rs`
- [X] T011 [US1] Registrar comandos de turnos en el inicializador de la aplicación en `src-tauri/src/lib.rs`
- [X] T012 [P] [US1] Implementar métodos `abrirTurno` y `obtenerEstadoTurnoActual` en `src/services/turnosApi.ts`
- [X] T013 [US1] Construir componente modal de apertura de turno con fondo inicial en `src/components/AperturaTurnoModal.tsx`
- [X] T014 [US1] Construir vista general de turno actual y saldo de gaveta en `src/components/TurnosView.tsx`
- [X] T015 [US1] Integrar pestaña "Turnos y Caja" y estado del turno en la navegación principal `src/App.tsx`

**Checkpoint**: User Story 1 funcional. El cajero puede abrir su turno y la gaveta comienza a contabilizar el dinero.

---

## Phase 4: User Story 2 - Cierre de Turno con Arqueo Ciego y Conciliación (Priority: P1) 🎯 MVP

**Goal**: Permitir el cierre de turno mediante recuento ciego sin mostrar saldos teóricos previos, calculando automáticamente faltantes/sobrantes y sellando el turno de forma inmutable.

**Independent Test**: Operar un turno con $10.000 de fondo y $15.000 cobrados en efectivo; declarar a ciegas $24.500 y comprobar que el sistema liquide un faltante de -$500, bloqueando nuevos cobros sobre el turno cerrado.

### Pruebas de User Story 2

- [X] T016 [P] [US2] Escribir prueba unitaria de arqueo ciego, cálculo de faltante/sobrante y descargo obligatorio si desvío $> \$1.000$ en `tests/domain_tests/test_turnos.rs`

### Implementación de User Story 2

- [X] T017 [US2] Implementar método `cerrar_turno_arqueo_ciego` con inserción atómica en `arqueos_cierre` y actualización a `Cerrado` en `src-tauri/src/storage/turnos_repo.rs`
- [X] T018 [US2] Implementar comando Tauri `cerrar_turno_arqueo_ciego` en `src-tauri/src/commands/turnos_commands.rs`
- [X] T019 [P] [US2] Implementar método `cerrarTurnoArqueoCiego` en `src/services/turnosApi.ts`
- [X] T020 [US2] Construir modal de arqueo ciego con recuento de billetes, cupones y cálculo de diferencias en `src/components/ArqueoCiegoModal.tsx`
- [X] T021 [US2] Conectar botón de cierre de turno y diálogo de advertencia de cuentas abiertas pendientes en `src/components/TurnosView.tsx`

**Checkpoint**: User Story 2 funcional. Cierre de turno inmutable y conciliación de diferencias operativa.

---

## Phase 5: User Story 3 - Retiros Parciales de Efectivo (Sangrías de Caja) (Priority: P2)

**Goal**: Permitir extracciones parciales de efectivo hacia caja fuerte durante picos de recaudación, validando que el monto solicitado no supere el efectivo disponible en gaveta.

**Independent Test**: Con $80.000 de efectivo acumulado en gaveta, registrar una sangría de $50.000; verificar que el saldo disponible se reduzca a $30.000 y que un intento de retirar $40.000 sea rechazado por saldo insuficiente.

### Pruebas de User Story 3

- [X] T022 [P] [US3] Escribir prueba de validación de retiros y bloqueo por saldo insuficiente en gaveta en `tests/domain_tests/test_turnos.rs`

### Implementación de User Story 3

- [X] T023 [US3] Implementar método `registrar_retiro` en `src-tauri/src/storage/turnos_repo.rs` con verificación transaccional de efectivo en gaveta
- [X] T024 [US3] Implementar comando Tauri `registrar_retiro_caja` en `src-tauri/src/commands/turnos_commands.rs`
- [X] T025 [P] [US3] Implementar método `registrarRetiroCaja` en `src/services/turnosApi.ts`
- [X] T026 [US3] Construir modal de registro de sangría con motivo y receptor en `src/components/RetiroModal.tsx`
- [X] T027 [US3] Integrar botón "Registrar Sangría" y listado de retiros en `src/components/TurnosView.tsx`

**Checkpoint**: User Story 3 funcional. La caja del balneario puede aliviar efectivo de forma segura y auditada.

---

## Phase 6: User Story 4 - Historial de Turnos y Comprobante de Liquidación (Priority: P2)

**Goal**: Permitir consultar turnos pasados y generar comprobante de liquidación formateado para impresoras térmicas de 80mm o visualización en pantalla.

**Independent Test**: Consultar el historial de turnos cerrados, seleccionar un turno y emitir el ticket de liquidación con desglose de fondo inicial, cobros por medio, sangrías, arqueo y diferencias.

### Pruebas de User Story 4

- [X] T028 [P] [US4] Escribir prueba de repositorio para consulta de historial y formateo de comprobante en `tests/storage_tests/test_turnos_repo.rs`

### Implementación de User Story 4

- [X] T029 [US4] Implementar métodos `listar_historial_turnos` y `obtener_detalle_turno` en `src-tauri/src/storage/turnos_repo.rs`
- [X] T030 [US4] Implementar generador de ticket de 80mm en Rust en `src-tauri/src/domain/turnos.rs` y comando `generar_comprobante_impresion_turno` en `src-tauri/src/commands/turnos_commands.rs`
- [X] T031 [P] [US4] Implementar métodos `listarHistorialTurnos`, `obtenerDetalleTurno` y `generarComprobante` en `src/services/turnosApi.ts`
- [X] T032 [US4] Construir modal visualizador e impresor de ticket de liquidación en `src/components/ComprobanteTurnoModal.tsx`
- [X] T033 [US4] Integrar pestaña/tabla de historial de turnos pasados con botón de ver comprobante en `src/components/TurnosView.tsx`

**Checkpoint**: User Story 4 funcional. Auditoría gerencial e impresión de comprobantes lista.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verificación de robustez, advertencias operativas y escenarios integrales.

- [X] T034 [P] Validar advertencia interactiva al registrar cobros en `src/components/CobroModal.tsx` si no existe turno de caja abierto
- [X] T035 [P] Ejecutar y verificar los 5 escenarios completos de `specs/004-gestion-turnos-arqueo-caja/quickstart.md`
- [X] T036 Actualizar artefacto de demostración interactiva `simulador_comandas.html` con la pestaña de turnos, arqueo ciego y ticket térmico

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

## Parallel Opportunities

- **Phase 1**: `T001` (Rust modules) y `T002` (TypeScript types) pueden ejecutarse en paralelo.
- **Phase 2**: `T004` (Domain entities) y `T006` (API client) pueden ejecutarse en paralelo mientras `T003` y `T005` preparan la persistencia.
- **Phase 3 (US1)**: `T007` (Unit test) y `T012` (Frontend API) en paralelo.
- **Phase 4 (US2)**: `T016` (Unit test) y `T019` (Frontend API) en paralelo.
- **Phase 5 (US3)**: `T022` (Unit test) y `T025` (Frontend API) en paralelo.
- **Phase 6 (US4)**: `T028` (Repo test) y `T031` (Frontend API) en paralelo.

---

## Implementation Strategy

### Estrategia MVP (User Story 1 + User Story 2)

1. Completar **Fase 1: Setup**
2. Completar **Fase 2: Foundational** (indispensable)
3. Completar **Fase 3: User Story 1** (Apertura de turno y vinculación de pagos)
4. Completar **Fase 4: User Story 2** (Cierre de turno y arqueo ciego)
5. **Verificación MVP**: El cajero puede abrir caja con cambio, cobrar ventas y cerrar con arqueo ciego auditado.
