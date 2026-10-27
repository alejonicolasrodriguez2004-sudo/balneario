# Quickstart Validation Guide: Gestión de Comandas

**Feature**: `001-gestion-comandas`  
**Date**: 2026-10-26  
**Status**: Ready for Validation  

Esta guía describe los escenarios de verificación ejecutables de extremo a extremo para validar que la funcionalidad de Gestión de Comandas opera de acuerdo a las especificaciones y principios de la Constitución.

---

## 1. Prerrequisitos de Entorno

- **Node.js** v18+ y **npm** (para la interfaz React y TypeScript).
- **Rust** y **Cargo** (edición 2021) con herramientas de compilación para Windows C++ Build Tools.
- **SQLite 3** (manejado de forma embebida a través de crates en Rust como `rusqlite` o `sqlx`).

---

## 2. Inicialización y Preparación de Pruebas

1. **Instalación de dependencias del frontend**:
   ```bash
   npm install
   ```
2. **Verificación de compilación del backend Rust**:
   ```bash
   cargo check --manifest-path src-tauri/Cargo.toml
   ```
3. **Ejecución de la suite de pruebas automatizadas**:
   ```bash
   # Pruebas unitarias de dominio y persistencia
   cargo test --manifest-path src-tauri/Cargo.toml
   
   # Pruebas de componentes y contratos frontend
   npm test
   ```

---

## 3. Escenarios de Validación Funcional Paso a Paso

### Escenario 1: Creación de Comanda con Ubicación y Productos (User Story 1 / P1)
- **Objetivo**: Verificar la creación y persistencia de una comanda en estado `Abierta` con cálculo de total y congelamiento de precios.
- **Procedimiento**:
  1. Iniciar la aplicación o ejecutar la prueba de integración de creación.
  2. Seleccionar la ubicación `Carpa 12`.
  3. Agregar `2x Licuado de Frutilla` (precio unitario: $2.500) con observación `"sin azúcar"`.
  4. Agregar `1x Tostado Mixto` (precio unitario: $3.500).
  5. Confirmar la comanda.
- **Resultado Esperado**:
  - Se genera una comanda con estado `Abierta` y código correlativo (ej. `CMD-0001`).
  - El total registrado es exactamente `$8.500,00` ($5.000 + $3.500).
  - Los precios unitarios de cada ítem quedan congelados en `$2.500,00` y `$3.500,00`.
  - La observación `"sin azúcar"` figura asociada al licuado.

### Escenario 2: Inmutabilidad ante Modificación Posterior de Precios (FR-005 / SC-002)
- **Objetivo**: Asegurar que un cambio en la lista de precios general no afecte comandas ya registradas.
- **Procedimiento**:
  1. En el catálogo general de productos, actualizar el precio de `Licuado de Frutilla` a `$3.000`.
  2. Consultar el detalle de la comanda `CMD-0001` creada en el Escenario 1.
- **Resultado Esperado**:
  - La comanda `CMD-0001` mantiene su precio unitario en `$2.500,00` y su total en `$8.500,00`.
  - Ninguna fila histórica fue modificada retroactivamente.

### Escenario 3: Adición Incremental de Productos a Comanda Abierta (User Story 3 / P2)
- **Objetivo**: Agregar consumos posteriores a una comanda en curso.
- **Procedimiento**:
  1. Abrir la comanda existente `CMD-0001`.
  2. Agregar `2x Café Cortado` (precio unitario: $1.800).
  3. Confirmar la adición.
- **Resultado Esperado**:
  - La comanda continúa en estado `Abierta`.
  - Se anexa una nueva línea de ítem con la marca temporal actual.
  - El total acumulado se actualiza a `$12.100,00` ($8.500 + $3.600).
  - Los ítems anteriores se mantienen idénticos.

### Escenario 4: Anulación y Cancelación con Trazabilidad (User Story 4 / P2)
- **Objetivo**: Probar el rechazo de cancelaciones sin motivo y la correcta baja lógica (*soft-cancel*) auditada.
- **Procedimiento**:
  1. Intentar cancelar el ítem `Tostado Mixto` dejando el motivo vacío.
     - *Resultado esperado*: El sistema bloquea la acción con error `MOTIVO_REQUERIDO`.
  2. Reintentar ingresando el motivo: `"Error de tipeo en comanda"`.
     - *Resultado esperado*: El ítem pasa a estado `Cancelado`, su subtotal ($3.500) se deduce del total de la comanda, pero el registro del ítem permanece visible en la auditoría.
  3. Anular la comanda completa ingresando motivo: `"Cliente se retira por tormenta"`.
- **Resultado Esperado**:
  - La comanda pasa a estado `Anulada`.
  - Queda registrado el operador, la fecha/hora y el motivo en `auditoria_comandas`.
  - La comanda queda bloqueada y no permite agregar más productos.

### Escenario 5: Resiliencia ante Cierre Abrupto / Corte de Energía (User Story 5 / P3)
- **Objetivo**: Probar la recuperación transparente de la base de datos local SQLite WAL.
- **Procedimiento**:
  1. Registrar una nueva comanda `CMD-0002` en `Mesa 4` con 1 producto y confirmar.
  2. Terminar de forma forzada el proceso de la aplicación (`kill` / `Stop-Process`).
  3. Reiniciar la aplicación.
  4. Consultar el listado de comandas.
- **Resultado Esperado**:
  - La comanda `CMD-0002` se recupera de forma íntegra con todos sus datos persistidos.
  - Cero corrupción de base de datos ni pérdida de pedidos confirmados.

---

## 4. Referencias

- Contratos de comandos IPC: [contracts/tauri-ipc-commands.md](contracts/tauri-ipc-commands.md)
- Modelo de datos relacional y DDL: [data-model.md](data-model.md)
- Decisiones técnicas y arquitectura: [research.md](research.md)
- Especificación funcional: [spec.md](spec.md)

