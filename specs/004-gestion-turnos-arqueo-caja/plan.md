# Implementation Plan: Gestión de Turnos de Caja y Arqueo Ciego

**Branch**: `004-gestion-turnos-arqueo-caja` | **Date**: 2026-10-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-gestion-turnos-arqueo-caja/spec.md`

---

## Summary

La funcionalidad implementa el control de ciclo de vida de los turnos de caja en el mostrador del balneario:
1. **Apertura de turno** por cajero con fondo inicial en efectivo para cambio, garantizando mediante índice único parcial en SQLite que solo exista un turno abierto simultáneamente.
2. **Vinculación unívoca de cobros** de cuentas (Feature 002) al turno activo.
3. **Retiros parciales de efectivo (sangrías)** hacia caja fuerte con control estricto de saldo disponible en gaveta.
4. **Cierre de turno con modalidad de arqueo ciego**: el cajero declara el recuento físico de dinero y comprobantes sin ver el saldo teórico; el backend calcula automáticamente las diferencias (Exacto, Sobrante o Faltante), congela el cierre de forma inmutable (Constitución Art. VI) y emite el comprobante de liquidación apto para impresoras térmicas de 80mm.

---

## Technical Context

**Language/Version**: Rust 1.75+ (Backend Tauri) & TypeScript 5.x / React 18 (Frontend).  
**Primary Dependencies**: `rusqlite` (v0.31, bundled SQLite con WAL mode), `serde`, `serde_json`, `chrono`, `lucide-react`, `tailwindcss`.  
**Storage**: SQLite 3 local monopuesto (`balneario_comandas.db`), tablas `turnos_caja`, `retiros_caja`, `arqueos_cierre` y columna aditiva `turno_id` en `pagos`.  
**Testing**: Pruebas unitarias de dominio en `tests/domain_tests/test_turnos.rs` y pruebas de repositorio transaccional en `tests/storage_tests/test_turnos_repo.rs`.  
**Target Platform**: Windows Desktop (Tauri nativo) 100% offline.  
**Project Type**: Desktop application (Tauri + React).  
**Performance Goals**: Apertura y cierre de turno en < 100 ms; cálculo de conciliación ciego en < 50 ms.  
**Constraints**: 100% offline-first, sin red externa ni microservicios; inmutabilidad histórica absoluta tras el cierre del turno.  
**Scale/Scope**: Terminal de caja principal del balneario con soporte de múltiples turnos cronológicos diarios.

---

## Constitution Check

*GATE: Verificación obligatoria contra la Constitución del Proyecto (`.specify/memory/constitution.md` v1.0.0).*

| Artículo Constitucional | Requisito / Cláusula | Estado | Justificación en el Diseño |
| :--- | :--- | :--- | :--- |
| **Art. I: Propósito y Confiabilidad** | Priorizar confiabilidad y utilidad operativa inmediata en balneario. | **PASS** | Flujo simple y ágil de caja sin pasos burocráticos innecesarios. |
| **Art. II: Desarrollo Guiado por Specs** | No codificar sin especificaciones y pruebas verificables. | **PASS** | `spec.md`, `research.md`, `data-model.md`, `contracts/` y `quickstart.md` generados previo al desarrollo. |
| **Art. III: Arquitectura y Tecnología** | Tauri + React + SQLite WAL + Rust sin acoplamientos espurios. | **PASS** | Módulos desacoplados en `turnos.rs` (dominio) y `turnos_repo.rs` (persistencia). |
| **Art. IV: Autonomía y Resiliencia** | 100% offline-first, monopuesto, SQLite WAL con PRAGMAs de resiliencia. | **PASS** | Persistencia transaccional local inmediata. Sin APIs externas. |
| **Art. V: Modularidad y Simplicidad** | Módulos cohesivos, entendibles por un solo desarrollador. | **PASS** | Estructura modular `turnos_caja` que extiende limpiamente el módulo `cuentas` y `pagos`. |
| **Art. VI: Integridad y Trazabilidad** | Cuentas, pagos y turnos diferenciados. Inmutabilidad de transacciones pasadas. | **PASS** | El arqueo de cierre sella el turno de forma inmutable. Pagos y precios pasados nunca se alteran. |
| **Art. VII: UX Gastronómica** | Alta legibilidad táctil, velocidad < 100ms, prevención de doble envío. | **PASS** | Modal de arqueo ciego claro, teclado numérico táctil y comprobante de ticket listo para imprimir. |

---

## Project Structure

### Documentation (this feature)

```text
specs/004-gestion-turnos-arqueo-caja/
├── spec.md              # Especificación funcional con historias de usuario y criterios de aceptación
├── plan.md              # Este documento de arquitectura técnica e implementación
├── research.md          # Decisiones de diseño (arqueo ciego, concurrencia, formato 80mm)
├── data-model.md        # Esquema relacional SQLite (turnos_caja, retiros_caja, arqueos_cierre)
├── quickstart.md        # 5 escenarios integrales de validación paso a paso
├── checklists/
│   └── requirements.md  # Checklist de calidad Spec Kit (16/16 PASS)
└── contracts/
    └── tauri-ipc-commands.md # Contratos IPC y DTOs TypeScript/Rust
```

### Source Code Layout

```text
src-tauri/src/
├── domain/
│   ├── mod.rs           # Registro público de submódulos de dominio
│   ├── turnos.rs        # Entidades TurnoCaja, RetiroCaja, ArqueoCierre y validaciones de saldo
│   └── errors.rs        # Errores de dominio (TurnoYaAbierto, SaldoInsuficiente, JustificacionRequerida)
├── storage/
│   ├── mod.rs           # Registro de turnos_repo
│   ├── migrations.rs    # DDL turnos_caja, retiros_caja, arqueos_cierre y ALTER TABLE pagos ADD turno_id
│   ├── turnos_repo.rs   # Repositorio TurnosRepository con transacciones SQLite
│   └── cuentas_repo.rs  # Vinculación automática de pagos al turno activo
├── commands/
│   ├── mod.rs
│   └── turnos_commands.rs # Controladores IPC Tauri (abrir, retirar, cerrar ciego, historial)
└── lib.rs               # Invocación de comandos en tauri::generate_handler![]

src/
├── types/
│   └── turnos.ts        # Interfaces y DTOs TypeScript
├── services/
│   ├── apiClient.ts     # Soporte mock offline en memoria para turnos y sangrías
│   └── turnosApi.ts     # Cliente de servicios frontend
└── components/
    ├── TurnosView.tsx   # Panel principal de turnos, estado de gaveta, retiros e historial
    ├── AperturaTurnoModal.tsx # Modal de fondo inicial
    ├── RetiroModal.tsx  # Modal de sangría de efectivo
    ├── ArqueoCiegoModal.tsx   # Modal de recuento ciego y conciliación de diferencias
    └── ComprobanteTurnoModal.tsx # Visualizador de ticket 80mm
```

---

## Phase Breakdown & Work Plan

### Phase 0: Research & Spike Resolution
- Resuelto en `specs/004-gestion-turnos-arqueo-caja/research.md`:
  - Índice parcial único SQLite para exclusión de doble turno abierto.
  - Adición no destructiva de `turno_id` en `pagos`.
  - Fórmula de control de gaveta para retiros seguros.
  - Diseño del ticket monospaciado para impresoras de 80mm.

### Phase 1: Core Design Artifacts
- Resuelto en `data-model.md`, `contracts/tauri-ipc-commands.md` y `quickstart.md`.

### Phase 2: Implementation Workflow (to be detailed in `/speckit-tasks`)
1. **Infraestructura y Persistencia**: Migración DDL SQLite en `migrations.rs`, entidades de dominio en `domain/turnos.rs` y repositorio `TurnosRepository` en `storage/turnos_repo.rs`.
2. **User Story 1 (P1)**: Apertura de turno con fondo inicial y validación de único turno abierto.
3. **User Story 2 (P1)**: Arqueo ciego, cálculo de faltante/sobrante y sellado inmutable.
4. **User Story 3 (P2)**: Registro de retiros parciales (sangrías) con validación de efectivo en gaveta.
5. **User Story 4 (P2)**: Historial cronológico de turnos y generación del comprobante de 80mm.
6. **Integración UI**: Pestaña "Turnos y Caja" en la interfaz React y actualización del simulador interactivo.
