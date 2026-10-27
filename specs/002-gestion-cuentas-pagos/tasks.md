# Tasks: Gestión de Cuentas y Pagos

**Input**: Design documents from `specs/002-gestion-cuentas-pagos/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/tauri-ipc-commands.md`, `quickstart.md`)  
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/`  
**Tests**: Se incluyen pruebas automatizadas de cálculo de saldos, transacciones de cobro y arqueo en cumplimiento de los Artículos II y IX de la Constitución.  
**Organization**: Tareas agrupadas por historia de usuario para permitir implementación y verificación independiente por fases.

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Ejecutable en paralelo (archivos independientes sin dependencias cruzadas pendientes).
- **[Story]**: Historia de usuario a la que pertenece (`[US1]`, `[US2]`, `[US3]`, `[US4]`, `[US5]`).
- Cada tarea especifica la ruta de archivo exacta sobre la que opera y las restricciones de validación.

---

## Phase 1: Setup (Infraestructura Compartida)

**Purpose**: Registro de módulos y tipos base para Cuentas, Pagos y Caja.

- [X] T001 [P] Registrar submódulos `cuentas` y `pagos` en `src-tauri/src/domain/mod.rs` y `src-tauri/src/storage/mod.rs`
- [X] T002 [P] Definir tipos TypeScript de cuentas, pagos y arqueo en `src/types/cuentas.ts`

---

## Phase 2: Foundational (Prerrequisitos Bloqueantes)

**Purpose**: Migraciones DDL en SQLite para `cuentas`, `cuenta_comandas`, `pagos` y `auditoria_pagos`, modelos de dominio y cliente API.

> **CRÍTICO**: No puede comenzar el desarrollo de las historias de usuario hasta completar esta fase fundacional.

- [X] T003 Implementar migración DDL en `src-tauri/src/storage/migrations.rs` para crear tablas `cuentas`, `cuenta_comandas`, `pagos` y `auditoria_pagos` con índices B-tree
- [X] T004 [P] Implementar entidades de dominio `Cuenta`, `Pago`, `MedioPago` y `EstadoCuenta` en `src-tauri/src/domain/cuentas.rs` y `src-tauri/src/domain/pagos.rs`
- [X] T005 Implementar estructura base del repositorio transaccional `CuentasRepository` en `src-tauri/src/storage/cuentas_repo.rs`
- [X] T006 [P] Implementar cliente de servicio frontend `src/services/cuentasApi.ts`

**Checkpoint**: Base fundacional completa. Tablas relacionales y tipos listos.

---

## Phase 3: User Story 1 - Consolidación de Comandas en Cuenta de Consumo (Priority: P1) 🎯 MVP

**Goal**: Unificar las comandas activas de una misma ubicación en una `Cuenta` de consumo formal con cálculo del importe bruto y saldo inicial.

**Independent Test**: Consolidar comandas de "Carpa 12", verificar que se cree `Cuenta` en estado `Abierta` con total y saldo idéntico a la suma de comandas.

### Pruebas de User Story 1

- [X] T007 [P] [US1] Escribir prueba unitaria de consolidación de comandas y cálculo de saldo inicial en `tests/domain_tests/test_cuentas_pagos.rs`

### Implementación de User Story 1

- [X] T008 [US1] Implementar método `abrir_cuenta` en `src-tauri/src/storage/cuentas_repo.rs` que consolida comandas activas y persiste la cuenta
- [X] T009 [US1] Implementar comandos Tauri `abrir_cuenta` y `obtener_cuenta` en `src-tauri/src/commands/cuentas_commands.rs`
- [X] T010 [US1] Registrar comandos de cuentas en el inicializador de la aplicación en `src-tauri/src/lib.rs`
- [X] T011 [P] [US1] Implementar métodos `abrirCuenta` y `obtenerCuenta` en el servicio frontend `src/services/cuentasApi.ts`
- [X] T012 [US1] Construir componente de vista general de cuentas por cobrar en `src/components/CuentasView.tsx`
- [X] T013 [US1] Integrar pestaña "Cuentas y Caja" en la navegación principal `src/App.tsx`

**Checkpoint**: User Story 1 funcional. Es posible consolidar comandas y abrir cuentas de liquidación.

---

## Phase 4: User Story 2 - Registro de Pagos Multimedio (Priority: P1)

**Goal**: Asentar cobros en efectivo con cálculo de vuelto, tarjetas o transferencias, deduciendo el saldo de la cuenta atómicamente.

**Independent Test**: Cobrar $5.000 en efectivo para cuenta de $8.500 recibiendo $10.000 (vuelto: $5.000); verificar que el saldo pase a $3.500 y se guarde el pago.

### Pruebas de User Story 2

- [X] T014 [P] [US2] Escribir prueba unitaria de cálculo de vuelto en efectivo y deducción de saldo en `tests/domain_tests/test_cuentas_pagos.rs`

### Implementación de User Story 2

- [X] T015 [US2] Implementar método `registrar_pago` con validación de saldo y token de idempotencia en `src-tauri/src/storage/cuentas_repo.rs`
- [X] T016 [US2] Implementar comando Tauri `registrar_pago` en `src-tauri/src/commands/cuentas_commands.rs`
- [X] T017 [P] [US2] Implementar método `registrarPago` en el servicio frontend `src/services/cuentasApi.ts`
- [X] T018 [US2] Construir modal de cobro táctil con selección de medio de pago y calculadora de vuelto en `src/components/CobroModal.tsx`
- [X] T019 [US2] Conectar modal de cobro en `src/components/CuentasView.tsx`

**Checkpoint**: User Story 2 funcional. Se pueden realizar cobros totales o parciales en efectivo, débito, crédito o transferencia.

---

## Phase 5: User Story 3 - División de Cuenta entre Comensales (Priority: P2)

**Goal**: Dividir el saldo pendiente entre N partes iguales o pagos parciales sucesivos absorbiendo diferencias de redondeo en la última cuota.

**Independent Test**: Dividir $10.000 entre 3 personas ($3.333,33, $3.333,33 y $3.333,34) y cobrar sucesivamente hasta saldo $0.

### Pruebas de User Story 3

- [X] T020 [P] [US3] Escribir prueba unitaria de algoritmo de división equitativa con ajuste de residuos en `tests/domain_tests/test_cuentas_pagos.rs`

### Implementación de User Story 3

- [X] T021 [US3] Construir modal asistente de división de cuenta en partes iguales en `src/components/DivisionCuentaModal.tsx`
- [X] T022 [US3] Conectar asistente de división con el flujo de cobro en `src/components/CuentasView.tsx`

**Checkpoint**: División de cuentas entre grupos de comensales operativa y verificable.

---

## Phase 6: User Story 4 - Cierre Operativo y Liberación de Ubicación Física (Priority: P2)

**Goal**: Bloquear terminantemente el cierre si saldo > 0 y permitir liquidar cuenta y liberar ubicación cuando saldo == 0.

**Independent Test**: Intentar liberar con saldo pendiente (debe fallar con `SALDO_PENDIENTE`), luego liquidar con saldo $0 y comprobar que la ubicación quede libre.

### Pruebas de User Story 4

- [X] T023 [P] [US4] Escribir prueba de repositorio verificando que `cerrar_cuenta_y_liberar` rechaza cuentas con saldo impago en `tests/storage_tests/test_cuentas_repo.rs`

### Implementación de User Story 4

- [X] T024 [US4] Implementar método `cerrar_cuenta_y_liberar` en `src-tauri/src/storage/cuentas_repo.rs`
- [X] T025 [US4] Implementar comando Tauri `cerrar_cuenta_y_liberar` en `src-tauri/src/commands/cuentas_commands.rs`
- [X] T026 [P] [US4] Implementar método `cerrarCuentaYLiberar` en el servicio frontend `src/services/cuentasApi.ts`
- [X] T027 [US4] Conectar botón de cierre y liberación en `src/components/CuentasView.tsx`

**Checkpoint**: Cierre operativo y liberación controlada de ubicaciones completada.

---

## Phase 7: User Story 5 - Anulación de Pagos y Auditoría de Arqueo de Turno (Priority: P3)

**Goal**: Anular pagos erróneos con motivo obligatorio restaurando el saldo y generar el resumen consolidado de caja del turno.

**Independent Test**: Anular pago de $5.000 con motivo y verificar que el saldo de la cuenta aumente en $5.000 y el arqueo neto descuente el cobro cancelado.

### Pruebas e Implementación de User Story 5

- [X] T028 [P] [US5] Escribir prueba unitaria de anulación de pago con baja lógica y recálculo de arqueo en `tests/domain_tests/test_cuentas_pagos.rs`
- [X] T029 [US5] Implementar métodos `anular_pago`, `anular_cuenta` y `obtener_resumen_arqueo` en `src-tauri/src/storage/cuentas_repo.rs`
- [X] T030 [US5] Implementar comandos Tauri `anular_pago`, `anular_cuenta` y `obtener_resumen_arqueo` en `src-tauri/src/commands/cuentas_commands.rs`
- [X] T031 [P] [US5] Implementar métodos `anularPago`, `anularCuenta` y `obtenerResumenArqueo` en `src/services/cuentasApi.ts`
- [X] T032 [US5] Construir modal de resumen y arqueo de caja de turno en `src/components/ArqueoCajaModal.tsx`
- [X] T033 [US5] Integrar botón de arqueo, anulación de pagos y anulación de cuenta en `src/components/CuentasView.tsx`

**Checkpoint**: Auditoría inmutable de pagos y arqueo de caja de turno completados.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verificación integral de consistencia contable y validación de escenarios.

- [X] T034 [P] Validar y blindar consistencia de saldo ante operaciones concurrentes en `src-tauri/src/storage/cuentas_repo.rs`
- [X] T035 [P] Ejecutar y verificar los 5 escenarios completos de `specs/002-gestion-cuentas-pagos/quickstart.md`, controlando que el tiempo de consulta del arqueo sea < 500 ms (SC-005) y el flujo de cobro ágil < 5 s (SC-001)
- [X] T036 Ejecutar formateo y análisis estático en `src-tauri/` y `src/`

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
   ▼                          ▼                          │
Phase 5: User Story 3 (P2)  Phase 6: US4 (P2)────────────┘
   │                          │
   └──────────────────────────┘
                │
                ▼
Phase 8: Polish & Cross-Cutting
```

---

## Implementation Strategy

### Estrategia MVP (User Story 1 + User Story 2)

1. Completar **Fase 1: Setup**
2. Completar **Fase 2: Foundational** (imprescindible)
3. Completar **Fase 3: User Story 1** (Consolidación de comandas en cuentas)
4. Completar **Fase 4: User Story 2** (Cobro de cuentas en efectivo con vuelto o tarjeta)
5. **Verificación**: Con US1 y US2, el balneario puede liquidar y cobrar consumos de forma autónoma.

