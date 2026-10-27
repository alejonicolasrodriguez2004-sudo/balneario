# Implementation Plan: Gestión de Catálogo de Productos y Precios

**Branch**: `003-gestion-catalogo-productos-precios` | **Date**: 2026-10-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-gestion-catalogo-productos-precios/spec.md`

## Summary

Implementar la administración dinámica del catálogo de productos y precios gastronómicos del balneario, incorporando altas, modificaciones, categorización visual, pausado rápido de ítems agotados por falta de stock y blindaje estricto de precios históricos garantizando que los ajustes de precios nunca alteren retroactivamente las comandas o cuentas pasadas (Constitución Art. VI).

Se mantiene la arquitectura de escritorio con **Tauri 2.x**, núcleo de dominio en **Rust** desacoplado, almacenamiento transaccional en **SQLite** (WAL mode) e interfaz táctil optimizada en **React** y **TypeScript**, funcionando de manera 100% autónoma y offline.

---

## Technical Context

**Language/Version**: 
- Backend: Rust 1.75+ (edición 2021)
- Frontend: TypeScript 5+ / React 18 / Node.js 18+

**Primary Dependencies**: 
- Backend: `tauri` v2, `rusqlite` con `bundled` y `chrono`, `serde`, `serde_json`, `thiserror`
- Frontend: `react`, `react-dom`, `@tauri-apps/api`, `lucide-react`, `tailwindcss`

**Storage**: 
- SQLite 3 local embebido con claves foráneas y modo WAL (`productos_referencia`, `categorias_referencia`, `historial_precios`), garantizando transacciones atómicas y retención de registros históricos.

**Testing**: 
- Backend: `cargo test` para validación de precios positivos, blindaje de ítems en comandas pasadas, auditoría inmutable en `historial_precios` y prevención de borrado físico.
- Frontend: Pruebas de integración del catálogo táctil y filtro instantáneo de productos.

**Target Platform**: 
- Windows Desktop (monopuesto local en mostrador/administración del balneario).

**Project Type**: 
- Desktop application (Tauri).

**Performance Goals**: 
- Reflejo de cambio de precio o pausado en comandería en < 100 ms.
- Filtrado y búsqueda por texto/categoría en < 50 ms.

**Constraints**: 
- 100% Offline (cero dependencias de servidores en la nube).
- Prohibición constitucional de alterar precios pasados de comandas o cuentas emitidas (Art. VI).
- Prohibición de eliminación física (`DELETE`) en productos con referencias comerciales (baja lógica `activo = 0`).

---

## Constitution Check

*GATE: Evaluado antes de Fase 0 y re-verificado tras el diseño de Fase 1.*

| Principio Constitucional | Estado | Justificación y Cumplimiento |
| :--- | :---: | :--- |
| **I. Propósito y Confiabilidad** | **PASS** | Provee al balneario el control dinámico de su carta y precios sin perder robustez ni complicar el mantenimiento. |
| **II. Desarrollo Guiado por Especificaciones** | **PASS** | Mapea estrictamente los requerimientos FR-001 a FR-011 y los criterios SC-001 a SC-005 de `spec.md`. |
| **III. Arquitectura y Tecnología** | **PASS** | Tauri, React, TS, SQLite WAL y Rust. Reglas de validación comercial en el núcleo `domain/` de Rust. |
| **IV. Autonomía Operativa y Resiliencia** | **PASS** | 100% offline-first. SQLite WAL protege ante caídas del sistema o cortes de energía sin corrupción de datos. |
| **V. Modularidad y Simplicidad** | **PASS** | Módulo de catálogo integrado de forma cohesiva al repositorio de referencias sin microservicios ni dependencias superfluas. |
| **VI. Integridad y Trazabilidad** | **PASS** | Precios pasados estrictamente congelados en comandas. Bajas lógicas obligatorias con `activo = 0` y auditoría en `historial_precios`. |
| **VII. Experiencia de Usuario Gastronómica** | **PASS** | Botón de pausado rápido ("Sin Stock / Agotado") en 1 toque e interfaz visual clasificada por pestañas de categorías. |
| **VIII. Alcance Incremental y Evolución** | **PASS** | Evoluciona sobre el catálogo semilla de la Feature 001 y 002 manteniendo total compatibilidad con comandas y cuentas previas. |
| **IX. Calidad y Responsabilidad IA** | **PASS** | Escenarios de validación documentados en `quickstart.md` y suite de pruebas planificada. |

---

## Project Structure

### Documentation (this feature)

```text
specs/003-gestion-catalogo-productos-precios/
├── spec.md              # Especificación funcional de requerimientos
├── plan.md              # Este plan de implementación
├── research.md          # Fase 0: Decisiones técnicas y justificaciones
├── data-model.md        # Fase 1: Entidades, diagramas y esquema relacional
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
│   └── catalogo.rs          # Entidades Producto, Categoria, HistorialPrecio y reglas de validación
├── storage/
│   ├── catalogo_repo.rs     # Repositorio SQLite para catálogo, disponibilidad e historial de precios
│   └── migrations.rs        # Migración DDL aditiva para categorías e historial
└── commands/
    └── catalogo_commands.rs # Controladores Tauri IPC para gestión del catálogo

src/
├── types/
│   └── catalogo.ts          # DTOs de TypeScript para Productos y Categorías
├── services/
│   └── catalogoApi.ts       # Cliente de invocación IPC para catálogo
└── components/
    ├── CatalogoView.tsx     # Vista administrativa general de productos y categorías
    └── ProductoModal.tsx    # Modal de alta/edición de producto y ajuste de precio

tests/
├── domain_tests/
│   └── test_catalogo.rs     # Pruebas unitarias de validación y blindaje de precios
└── storage_tests/
    └── test_catalogo_repo.rs # Pruebas SQLite de persistencia, pausado y baja lógica
```

---

## Complexity Tracking

> *Sin violaciones constitucionales. Modelo relacional simplificado y robusto para el balneario.*

| Violación | Por qué se necesita | Alternativa más simple rechazada por |
| :--- | :--- | :--- |
| *Ninguna* | No aplica | No se utilizan bases de datos en la nube ni servicios externos. |
