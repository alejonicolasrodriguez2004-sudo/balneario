# Research & Technical Decisions: Gestión de Comandas

**Feature**: `001-gestion-comandas`  
**Date**: 2026-10-26  
**Status**: Completed  

Este documento consolida las decisiones técnicas y de arquitectura para el módulo de Gestión de Comandas, evaluadas a la luz de la Constitución del Proyecto (confiabilidad operativa, 100% offline, modularidad, desacoplamiento e integridad).

---

## 1. Plataforma de Escritorio y Runtime

- **Decisión**: Tauri 2.x con Rust en backend nativo y React + TypeScript en frontend.
- **Racional**: 
  - Cumple estrictamente con el **Artículo III** de la Constitución.
  - Ofrece un binario ligero (<15 MB), bajo consumo de memoria RAM (<50 MB) y arranque instantáneo, idóneo para computadoras estándar de balneario.
  - El backend en Rust garantiza seguridad de tipos y control riguroso de operaciones de bajo nivel y transacciones locales.
- **Alternativas consideradas**:
  - *Electron*: Descartado por su alto consumo de memoria RAM (>300 MB), sobrecarga de CPU y lentitud de inicio en equipos modestos.
  - *Web app tradicional*: Descartada por el requerimiento fundacional de operar 100% offline con acceso a base de datos embebida local sin dependencia de navegadores externos ni servidores web locales complejos.

---

## 2. Persistencia Local y Resiliencia ante Fallos

- **Decisión**: SQLite local embebido con modo `PRAGMA journal_mode = WAL` (Write-Ahead Logging) y `PRAGMA synchronous = NORMAL`.
- **Racional**:
  - Garantiza propiedades ACID completas en un único archivo local sin necesidad de instalar o mantener un servidor de base de datos.
  - El modo WAL permite lecturas y escrituras simultáneas y es altamente resiliente a caídas repentinas del sistema o cortes de energía eléctrica (requisito central de **Artículo IV** y **FR-014** / **SC-003**).
  - Al reiniciarse la aplicación, SQLite recupera automáticamente el estado consistente procesando el archivo WAL, eliminando riesgos de archivos corruptos.
- **Alternativas consideradas**:
  - *Archivos JSON / Flat files*: Descartados por riesgo crítico de corrupción en caso de interrupción en mitad de la escritura, y ausencia de transacciones atómicas.
  - *DuckDB / RocksDB*: Descartados por ser motores orientados a analítica OLAP o almacenamiento clave-valor sin las ventajas transaccionales relacionales de SQLite para modelado comercial.

---

## 3. Desacoplamiento de Lógica de Negocio y Dominio

- **Decisión**: Módulo de Dominio puro en Rust (`src-tauri/src/domain`) independiente de la base de datos y de la UI.
- **Racional**:
  - Satisface el **Artículo III** ("La lógica de negocio deberá mantenerse independiente de la interfaz, la base de datos y los dispositivos de impresión") y el **Artículo VI** ("La interfaz nunca será la única responsable de validar operaciones críticas").
  - El cálculo de totales, la validación de cantidades (> 0), la verificación de estados válidos y la exigencia de motivos de anulación se ejecutan en el dominio de negocio, no en controladores web ni en consultas SQL aisladas.
- **Alternativas consideradas**:
  - *Lógica compartida en TypeScript / Frontend*: Descartada porque dejaría la integridad en manos de la capa visual y violaría el principio de no confiar únicamente en la interfaz.

---

## 4. Ciclo de Vida y Máquina de Estados de la Comanda

- **Decisión**: Máquina de estados determinista con 4 estados formales: `Borrador`, `Abierta`, `Cerrada` y `Anulada`.
  - Transiciones permitidas:
    - `Borrador` → `Abierta` (al confirmar la comanda con al menos 1 ítem válido y ubicación).
    - `Abierta` → `Abierta` (al agregar nuevos ítems en rondas incrementales).
    - `Abierta` → `Cerrada` (al finalizar el consumo operativo).
    - `Abierta` → `Anulada` (por baja justificada con motivo obligatorio).
  - Estados terminales para adición de ítems: `Cerrada` y `Anulada`.
- **Racional**:
  - Modela con claridad el proceso operativo del balneario.
  - Bloquea cualquier intento de alterar comandas cerradas o anuladas, garantizando la inmutabilidad de estados pasados.
- **Alternativas consideradas**:
  - *Flags booleanos (`activa`, `cancelada`)*: Descartados por propensión a combinaciones inválidas o ambiguas de estado.

---

## 5. Inmutabilidad de Precios Históricos y Trazabilidad

- **Decisión**: *Snapshot* inmutable del precio unitario y nombre del producto en la entidad `ItemComanda` al momento de la incorporación (`precio_unitario_historico`), acompañado de una tabla de auditoría `AuditoriaComanda`.
- **Racional**:
  - Requisito constitucional no negociable (**Artículo VI**): "Los importes y precios históricos no podrán alterarse retroactivamente por cambios en la configuración comercial".
  - Si el administrador ajusta la lista de precios a mitad de temporada, todas las comandas creadas previamente conservan sus importes unitarios y totales inalterados (**SC-002**).
  - Las anulaciones de comanda y cancelaciones de ítem son bajas lógicas (*soft-delete*) que requieren motivo textual obligatorio, conservando usuario y fecha/hora.
- **Alternativas consideradas**:
  - *Referencia dinámica mediante FK a tabla productos*: Descartada tajantemente porque actualizaría los precios retroactivamente al recalcular o imprimir, distorsionando la caja y las cuentas.

---

## 6. Prevención de Duplicados e Idempotencia

- **Decisión**: Patrón de Token de Solicitud de Cliente + deshabilitación de botón en UI durante la confirmación + correlativo secuencial atómico en SQLite.
- **Racional**:
  - En momentos de alta demanda y prisa en el balneario, es frecuente el doble clic accidental.
  - La transacción en SQLite verifica unicidad y el backend ignora solicitudes concurrentes con el mismo identificador de operación, asegurando cero duplicados (**FR-015**, **SC-006**).
- **Alternativas consideradas**:
  - *Solo deshabilitación visual en UI*: Descartada por insuficiente (la interfaz nunca debe ser la única barrera de validación).

---

## 7. Ergonomía de Interfaz para Entorno Gastronómico

- **Decisión**: Interfaz con tipografía de alta legibilidad, contraste reforzado apto para reflejos solares, botones de selección de ubicación y catálogo con dimensiones mínimas táctiles de 48×48 px.
- **Racional**:
  - **Artículo VII** de la Constitución: La interfaz debe ser rápida, clara y minimizar errores operativos en horas pico de atención bajo sol y movimiento constante.
- **Alternativas consideradas**:
  - *Formularios de escritorio convencionales con campos densos*: Descartados por lentitud de digitación e incomodidad en pantallas de mostrador.

