# Implementation Plan: Gestión de Cuentas y Pagos

**Branch**: `002-gestion-cuentas-pagos` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-gestion-cuentas-pagos/spec.md`

## Summary

Implementar la consolidación de comandas en cuentas de consumo unificadas por ubicación, el registro de cobros multimedio (efectivo con cálculo de vuelto, tarjetas y transferencias), la división de cuentas entre comensales con ajuste de redondeo de centavos, el control estricto de liberación de mesas/carpas supeditado a saldo cero y la auditoría de pagos con arqueo de caja de turno.

Se mantiene la arquitectura de escritorio con **Tauri 2.x**, núcleo de dominio en **Rust** desacoplado, almacenamiento transaccional en **SQLite** (WAL mode) e interfaz ergonómica táctil en **React** y **TypeScript**, funcionando de manera 100% autónoma y offline.

---

## Technical Context

**Language/Version**: 
- Backend: Rust 1.75+ (edición 2021)
- Frontend: TypeScript 5+ / React 18 / Node.js 18+

**Primary Dependencies**: 
- Backend: `tauri` v2, `rusqlite` con `bundled` y `chrono`, `serde`, `serde_json`, `thiserror`, `uuid`
- Frontend: `react`, `react-dom`, `@tauri-apps/api`, `lucide-react`, `tailwindcss`

**Storage**: 
- SQLite 3 local embebido con claves foráneas y modo WAL (`cuentas`, `cuenta_comandas`, `pagos`, `auditoria_pagos`), garantizando transacciones atómicas para cobros y saldos.

**Testing**: 
- Backend: `cargo test` para transacciones de pago, recálculo atómico de saldo, rechazo de pagos excedentes y división de cuentas.
- Frontend: `vitest` / React Testing Library para el asistente de cobro y cálculo de vuelto.

**Target Platform**: 
- Windows Desktop (monopuesto local en mostrador/caja del balneario).

**Project Type**: 
- Desktop application (Tauri).

**Performance Goals**: 
- Registro de cobro y recálculo de saldo en < 5 segundos de interacción.
- Resumen de arqueo de caja de turno en < 500 ms.

**Constraints**: 
- 100% Offline (cero dependencias de APIs en la nube o pasarelas online obligatorias).
- Desacoplamiento conceptual estricto entre Comanda, Cuenta y Pago (Constitución Art. VI).
- Prohibición de liberación de carpas o mesas con saldo pendiente mayor a cero.

---

## Constitution Check

*GATE: Evaluado antes de Fase 0 y re-verificado tras el diseño de Fase 1.*

| Principio Constitucional | Estado | Justificación y Cumplimiento |
| :--- | :---: | :--- |
| **I. Propósito y Confiabilidad** | **PASS** | Resuelve la cobranza y liquidación de consumos del balneario piloto de forma clara, robusta y confiable. |
| **II. Desarrollo Guiado por Especificaciones** | **PASS** | Mapea directamente los requerimientos FR-001 a FR-016 y los criterios SC-001 a SC-006 de `spec.md`. |
| **III. Arquitectura y Tecnología** | **PASS** | Tauri, React, TS, SQLite y Rust. Lógica de cálculo contable y validación de cobro en `domain/` de Rust, aislada de la UI. |
| **IV. Autonomía Operativa y Resiliencia** | **PASS** | 100% offline-first. SQLite WAL protege los cobros ante caídas del sistema o cortes de energía sin descuadres. |
| **V. Modularidad y Simplicidad** | **PASS** | Módulo de cuentas y pagos integrado limpiamente al backend y frontend sin microservicios ni dependencias superfluas. |
| **VI. Integridad y Trazabilidad** | **PASS** | Comanda, Cuenta y Pago son entidades diferenciadas. Pagos cancelados por baja lógica con motivo y auditoría inmutable. |
| **VII. Experiencia de Usuario Gastronómica** | **PASS** | Asistente de cobro con cálculo de vuelto instantáneo y botones grandes aptos para la velocidad de caja en horas pico. |
| **VIII. Alcance Incremental y Evolución** | **PASS** | Integra comandas preexistentes de la Feature 001 y permite pagos fraccionados para el cliente piloto sin bifurcar código. |
| **IX. Calidad y Responsabilidad IA** | **PASS** | Escenarios de validación documentados en `quickstart.md` y suite de pruebas planificada. |

---

## Project Structure

### Documentation (this feature)

```text
specs/002-gestion-cuentas-pagos/
├── spec.md              # Especificación funcional de requerimientos
├── plan.md              # Este plan de implementación
├── research.md          # Fase 0: Decisiones técnicas y justificaciones
├── data-model.md        # Fase 1: Entidades, diagramas, reglas y DDL SQLite
├── quickstart.md        # Fase 1: Guía de validación y escenarios ejecutables
├── contracts/           # Fase 1: Contratos de interfaz y DTOs
│   └── tauri-ipc-commands.md
└── checklists/
    └── requirements.md  # Checklist de calidad de la especificación
```

### Source Code Additions (repository layout)

```text
src-tauri/src/
├── domain/
│   ├── cuentas.rs           # Entidad Cuenta, validación de saldos y transiciones
│   └── pagos.rs             # Entidad Pago, medios de pago y cálculo de vuelto
├── storage/
│   └── cuentas_repo.rs      # Repositorio transaccional de Cuentas, Pagos y Arqueo
└── commands/
    └── cuentas_commands.rs  # Controladores Tauri IPC para cobranzas y caja

src/
├── types/
│   └── cuentas.ts           # DTOs de TypeScript para Cuentas, Pagos y Arqueo
├── services/
│   └── cuentasApi.ts        # Cliente de invocación IPC para cobranzas
└── components/
    ├── CuentasView.tsx      # Vista general de cuentas por cobrar y liquidar
    ├── CobroModal.tsx       # Modal de pago con medios (efectivo, tarjeta, transf) y vuelto
    ├── DivisionCuentaModal.tsx # Asistente de cálculo de división en N cuotas
    └── ArqueoCajaModal.tsx  # Resumen consolidado del turno por medio de pago

tests/
├── domain_tests/
│   └── test_cuentas_pagos.rs # Pruebas unitarias de cálculo de saldo y división
└── storage_tests/
    └── test_cuentas_repo.rs  # Pruebas de integración SQLite de transacciones de pago
```

---

## Complexity Tracking

> *Sin violaciones constitucionales. Modelo financiero local limpio y simplificado para el balneario.*

| Violación | Por qué se necesita | Alternativa más simple rechazada por |
| :--- | :--- | :--- |
| *Ninguna* | No aplica | No se utilizan pasarelas en la nube ni servicios bancarios online obligatorios. |
