# Research & Technical Decisions: Gestión de Cuentas y Pagos

**Feature**: `002-gestion-cuentas-pagos`  
**Date**: 2026-10-27  
**Status**: Completed  

Este documento establece las decisiones técnicas y patrones de arquitectura para el módulo de Gestión de Cuentas y Pagos, garantizando el estricto cumplimiento del **Artículo VI** (diferenciación de entidades, inmutabilidad y auditoría) y **Artículo IV** (autonomía 100% offline) de la Constitución.

---

## 1. Desacoplamiento de Entidades: Comanda, Cuenta y Pago

- **Decisión**: Modelar `Cuenta` como una entidad transaccional independiente que agrupa comandas mediante la tabla asociativa `cuenta_comandas`, y modelar `Pago` como transacciones financieras individuales asociadas a la `Cuenta`.
- **Racional**:
  - Cumple directamente con el **Artículo VI** de la Constitución: *"Las comandas, las cuentas y los pagos serán entidades diferenciadas"*.
  - En un balneario, una carpa puede recibir 3 pedidos escalonados durante el día (tres comandas distintas generadas en momentos diferentes). La `Cuenta` consolida esos consumos para su liquidación final.
  - Los cobros no se imputan a productos sueltos ni a comandas individuales, sino al saldo global de la cuenta consolidada.
- **Alternativas consideradas**:
  - *Agregar campos de pago directamente a la tabla `comandas`*: Descartado por violar la Constitución y por impedir la consolidación de múltiples comandas de una misma carpa en una única liquidación.

---

## 2. Integridad Contable y Cálculo de Saldo en SQLite

- **Decisión**: Cálculo del saldo pendiente con validación atómica en la misma transacción SQLite:
  $$\text{saldo\_pendiente} = \text{total} - \sum \text{pagos\_activos}$$
  El registro de un pago actualiza el saldo de la cuenta atómicamente. Si el monto imputado supera el saldo pendiente, la transacción se aborta con error `MONTO_EXCEDE_SALDO`.
- **Racional**:
  - **Artículo VI**: *"Las operaciones críticas deberán ser consistentes, auditables y resistentes a duplicaciones accidentales. La interfaz nunca será la única responsable de validar operaciones críticas"*.
  - Asegura que ante caídas repentinas no puedan existir pagos asentados sin actualizar el saldo de la cuenta.
- **Alternativas consideradas**:
  - *Calcular el saldo solo en la interfaz de usuario*: Descartado porque violaría el principio de no confiar la integridad exclusivamente a la UI.

---

## 3. Manejo de Efectivo, Vuelto y Arqueo Físico de Caja

- **Decisión**: Para pagos en efectivo, registrar tres dimensiones numéricas en la entidad `Pago`:
  1. `monto`: Importe neto imputado a la cuenta (disminuye el saldo).
  2. `monto_entregado`: Dinero físico que el cliente entregó al cajero.
  3. `vuelto`: Cambio exacto devuelto al cliente ($monto\_entregado - monto$).
- **Racional**:
  - En el arqueo de fin de turno, el cajero debe cuadrar el dinero físico del cajón: el efectivo real ingresado en caja corresponde a la suma de los importes netos cobrados. El registro de `monto_entregado` y `vuelto` permite resolver discrepancias si el cliente reclama por un vuelto mal dado.
- **Alternativas consideradas**:
  - *Solo registrar el importe neto cobrado*: Descartado porque no deja constancia del billete recibido ni del vuelto calculado en transacciones en efectivo.

---

## 4. Algoritmo de División de Cuenta con Ajuste de Redondeo

- **Decisión**: Algoritmo de distribución de cuotas con absorción de residuos en la última cuota:
  - Para dividir un saldo $S$ en $N$ comensales:
    $$\text{cuota\_base} = \frac{\lfloor (S / N) \times 100 \rfloor}{100}$$
  - Las primeras $N - 1$ partes pagan $\text{cuota\_base}$.
  - La parte $N$-ésima paga:
    $$\text{cuota\_final} = S - ((N - 1) \times \text{cuota\_base})$$
- **Racional**:
  - Evita diferencias de centavos huérfanas en divisiones inexactas (por ejemplo, \$10.000 dividido entre 3: dos cuotas de \$3.333,33 y una de \$3.333,34).
  - Garantiza que al pagar las $N$ partes el saldo resultante sea exactamente \$0,00.

---

## 5. Trazabilidad de Anulaciones y Auditoría de Arqueo

- **Decisión**: Bajas lógicas (*soft-delete*) de pagos con motivo obligatorio (mínimo 4 caracteres), registrando la operación en `auditoria_pagos` y reabriendo el saldo de la cuenta.
- **Racional**:
  - Prohíbe la eliminación física (`DELETE`) en cumplimiento del **Artículo VI** de la Constitución.
  - El resumen de caja del turno permite agrupar los pagos activos por medio (*Efectivo*, *Tarjeta Débito*, *Tarjeta Crédito*, *Transferencia*) y listar las anulaciones para auditoría administrativa.
- **Alternativas consideradas**:
  - *Eliminar el registro de pago erróneo*: Descartado por destruir la trazabilidad de caja e impedir detectar fraudes o errores recurrentes de cajeros.

---

## 6. Autonomía Offline y Medios Electrónicos Físicos

- **Decisión**: Los cobros con tarjetas o transferencias se consideran operaciones asistidas por hardware local externo (POS físico / app bancaria del cliente); el sistema no depende de internet ni de APIs bancarias externas para registrar la transacción.
- **Racional**:
  - **Artículo IV**: *"Las funciones esenciales deberán operar sin conexión a internet ni dependencia de servicios externos"*.
  - En balnearios la conectividad suele caerse, pero los cobros con POS celular o efectivo continúan. El sistema debe permitir asentar el cobro localmente siempre.

