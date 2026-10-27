# Quickstart Validation Guide: Gestión de Cuentas y Pagos

**Feature**: `002-gestion-cuentas-pagos`  
**Date**: 2026-10-27  
**Status**: Ready for Validation  

Esta guía describe los escenarios de verificación ejecutables de extremo a extremo para validar que la consolidación de cuentas, el cobro multimedio y la liberación de ubicaciones operan conforme a las especificaciones y principios constitucionales.

---

## 1. Prerrequisitos

- Base de datos local SQLite con catálogos de referencia cargados y al menos una comanda confirmada en una ubicación (ej. `Carpa 12` con total de \$8.500).

---

## 2. Escenarios de Validación Funcional

### Escenario 1: Consolidación de Comandas en Cuenta (User Story 1 / P1)
- **Objetivo**: Abrir una cuenta para "Carpa 12" y verificar el cálculo consolidado del saldo inicial.
- **Procedimiento**:
  1. Seleccionar la ubicación `Carpa 12`.
  2. Ejecutar la acción **Abrir Cuenta / Cerrar Mesa**.
- **Resultado Esperado**:
  - Se genera una entidad `Cuenta` con código correlativo (ej. `CTA-0001`).
  - El estado inicial de la cuenta es `Abierta`.
  - El `total` y el `saldo_pendiente` coinciden exactamente con la suma de las comandas activas (\$8.500).

### Escenario 2: Cobro en Efectivo con Cálculo de Vuelto (User Story 2 / P1)
- **Objetivo**: Comprobar el cálculo de cambio y la deducción del saldo de la cuenta.
- **Procedimiento**:
  1. En la cuenta `CTA-0001` (saldo: \$8.500), registrar un cobro en `Efectivo` por \$5.000.
  2. Ingresar como importe entregado por el cliente: \$10.000.
  3. Confirmar el pago.
- **Resultado Esperado**:
  - El sistema muestra el vuelto a entregar al cliente: **\$5.000,00**.
  - Se registra el pago de \$5.000 en la tabla `pagos`.
  - El saldo pendiente de la cuenta se actualiza a **\$3.500,00**.
  - La cuenta permanece en estado `Abierta` (porque aún adeuda \$3.500).

### Escenario 3: División de Cuenta entre Comensales (User Story 3 / P2)
- **Objetivo**: Dividir el saldo restante y liquidar la cuenta por tramos.
- **Procedimiento**:
  1. Con el saldo pendiente en \$3.500, activar la herramienta de división en **2 partes**.
  2. El sistema sugiere cuotas de \$1.750 cada una.
  3. Cobrar la primera cuota (\$1.750) con `Tarjeta Débito`.
     - *Verificación*: El saldo queda en \$1.750.
  4. Cobrar la segunda cuota (\$1.750) mediante `Transferencia Local` con nro. de referencia `TX-998811`.
- **Resultado Esperado**:
  - El saldo pendiente llega exactamente a **\$0,00**.
  - El estado de la cuenta pasa automáticamente a **`Pagada`**.

### Escenario 4: Bloqueo de Liberación con Deuda y Cierre Operativo (User Story 4 / P2)
- **Objetivo**: Asegurar que ninguna ubicación pueda liberarse si tiene saldo impago.
- **Procedimiento**:
  1. En una cuenta con saldo > \$0, intentar ejecutar **Liberar Ubicación**.
     - *Resultado esperado*: El sistema bloquea la acción con error `SALDO_PENDIENTE`.
  2. En la cuenta `CTA-0001` ya `Pagada` (saldo = \$0), ejecutar **Cerrar y Liberar Ubicación**.
- **Resultado Esperado**:
  - La cuenta pasa a estado terminal `Cerrada`.
  - Las comandas asociadas quedan selladas.
  - La `Carpa 12` queda liberada y disponible para nuevos clientes.

### Escenario 5: Anulación Justificada de Pago y Arqueo de Turno (User Story 5 / P3)
- **Objetivo**: Probar la anulación auditada de un pago erróneo y la conciliación de caja.
- **Procedimiento**:
  1. Sobre un pago registrado, solicitar anulación intentando dejar el motivo vacío (debe fallar).
  2. Ingresar motivo: `"Cobro duplicado por error de operador"` y confirmar.
  3. Consultar el resumen de arqueo de turno.
- **Resultado Esperado**:
  - El pago pasa a estado `Cancelado` (baja lógica).
  - El saldo de la cuenta se incrementa por el valor del pago anulado.
  - En el arqueo de turno, el total recaudado neto disminuye por el valor anulado y se reporta 1 pago anulado.

---

## 3. Referencias

- Contratos de comandos IPC: [contracts/tauri-ipc-commands.md](contracts/tauri-ipc-commands.md)
- Modelo de datos relacional y DDL: [data-model.md](data-model.md)
- Decisiones técnicas y arquitectura: [research.md](research.md)
- Especificación funcional: [spec.md](spec.md)

