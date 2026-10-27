# Feature Specification: Gestión de Turnos de Caja y Arqueo Ciego

**Feature Branch**: `004-gestion-turnos-arqueo-caja`  
**Created**: 2026-10-27  
**Status**: Draft  
**Input**: Gestión de Turnos de Caja y Arqueo Ciego (Apertura de turno con fondo inicial, retiros parciales, arqueo de cierre y reporte de diferencias)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Apertura de Turno con Fondo Inicial de Cambio (Priority: P1) 🎯 MVP

Como cajero o encargado de turno del balneario,  
quiero iniciar mi jornada laboral declarando el fondo de caja inicial recibido para dar vuelto,  
para establecer una base contable clara y auditada antes de comenzar a registrar ventas y cobros.

**Why this priority**: Es la base del control patrimonial y el prerrequisito para habilitar las operaciones de cobro en efectivo y conciliación diaria en el punto de cobro del balneario.

**Independent Test**: Abrir un turno con $25.000 de fondo inicial a nombre de "cajero_mañana" y verificar que el estado del turno pase a activo, permitiendo consultar el balance inicial de apertura.

**Acceptance Scenarios**:
1. **Given** que no existe ningún turno de caja abierto en la terminal,  
   **When** el cajero ingresa su nombre/identificador y un fondo inicial de $25.000 y confirma la apertura,  
   **Then** el sistema inicia un nuevo turno en estado "Abierto", registra la fecha/hora exacta y habilita la recepción de cobros vinculados a este turno.
2. **Given** que ya existe un turno abierto previamente,  
   **When** otro operador intenta abrir un segundo turno en la misma terminal,  
   **Then** el sistema bloquea la acción e informa que debe cerrarse el turno activo antes de iniciar uno nuevo.
3. **Given** el formulario de apertura de turno,  
   **When** el operador intenta abrir el turno con un fondo inicial negativo o sin indicar el responsable,  
   **Then** el sistema rechaza la operación exigiendo datos válidos.

---

### User Story 2 - Cierre de Turno con Arqueo Ciego y Conciliación de Diferencias (Priority: P1) 🎯 MVP

Como cajero o supervisor administrativo,  
quiero realizar el arqueo ciego al terminar el turno ingresando el dinero físico y comprobantes contados sin ver previamente los totales del sistema,  
para transparentar la conciliación de caja, detectar faltantes o sobrantes y generar el acta de cierre inmutable.

**Why this priority**: El arqueo ciego evita manipulaciones o sesgos en el recuento físico y garantiza el cumplimiento estricto del Artículo VI de la Constitución sobre trazabilidad e integridad financiera.

**Independent Test**: Operar un turno con $10.000 de fondo inicial y $15.000 cobrados en efectivo ($25.000 teóricos); ingresar un recuento ciego de $24.500 y verificar que el cierre registre un faltante de -$500, bloqueando futuras operaciones sobre el turno cerrado.

**Acceptance Scenarios**:
1. **Given** un turno de caja abierto con cobros registrados en efectivo, débito, crédito y transferencia,  
   **When** el cajero inicia el cierre de turno,  
   **Then** la pantalla de arqueo ciego solicita ingresar el recuento de efectivo en gaveta y subtotales de cupones sin revelar los totales calculados por el sistema.
2. **Given** el recuento ciego completado por el cajero,  
   **When** el usuario confirma el arqueo de cierre,  
   **Then** el sistema calcula y muestra la comparativa entre el importe teórico esperado y el declarado, calculando la diferencia exacta (Exacto, Sobrante o Faltante).
3. **Given** una diferencia de dinero superior a un umbral de tolerancia establecido,  
   **When** se procede al cierre,  
   **Then** el sistema exige una justificación/observación obligatoria antes de confirmar el cierre definitivo.
4. **Given** un turno que ha sido cerrado,  
   **When** se intentan ingresar nuevos cobros o retiros a dicho turno,  
   **Then** el sistema rechaza cualquier modificación, conservando el estado final inmutable.

---

### User Story 3 - Retiros Parciales de Efectivo (Sangrías de Caja) (Priority: P2)

Como cajero o encargado de seguridad del balneario,  
quiero registrar retiros parciales de efectivo durante la tarde para trasladar excedentes de recaudación a la caja fuerte del balneario,  
para minimizar el riesgo de robo o pérdida en la gaveta del mostrador de playa manteniendo el saldo teórico conciliado.

**Why this priority**: En días de alta concurrencia de playa la gaveta acumula sumas elevadas de efectivo; el retiro seguro con comprobante es indispensable para la seguridad operativa del establecimiento.

**Independent Test**: Registrar una sangría de $50.000 en un turno con $80.000 de efectivo acumulado; verificar que el saldo disponible en gaveta se reduzca a $30.000 y que la auditoría refleje el retiro con motivo y responsable.

**Acceptance Scenarios**:
1. **Given** un turno abierto con recaudación en efectivo,  
   **When** el cajero registra un retiro de efectivo indicando el monto a retirar, el motivo y la persona que retira el dinero,  
   **Then** el sistema descuenta el importe del saldo en gaveta y genera un registro de egreso auditado.
2. **Given** un saldo actual en efectivo de $20.000 en gaveta,  
   **When** se intenta registrar un retiro por $25.000,  
   **Then** el sistema bloquea el retiro advirtiendo que el monto supera el efectivo físico disponible en la caja.
3. **Given** un retiro confirmado exitosamente,  
   **When** se efectúa posteriormente el arqueo de cierre de turno,  
   **Then** el cálculo del efectivo esperado descuenta automáticamente el total de retiros parciales efectuados.

---

### User Story 4 - Historial de Turnos y Resumen de Cierre de Caja (Priority: P2)

Como administrador o dueño del balneario,  
quiero consultar el historial de turnos pasados con sus arqueos, diferencias y detalle de medios de cobro,  
para disponer de auditoría contable completa y emitir el comprobante resumen de caja diario.

**Why this priority**: Brinda control gerencial sobre los operadores, permite detectar patrones recurrentes de desvíos en caja y provee la información necesaria para asentar la recaudación en los libros del balneario.

**Independent Test**: Consultar la lista histórica de turnos cerrados, seleccionar un turno específico y visualizar el desglose detallado de fondo inicial, cobros por medio de pago, retiros, recuento ciego y resultado final.

**Acceptance Scenarios**:
1. **Given** una lista de turnos de caja previos,  
   **When** el administrador consulta el historial,  
   **Then** visualiza un listado cronológico con fecha, cajero, estado (Abierto/Cerrado), total recaudado y resultado del arqueo (diferencia).
2. **Given** un turno cerrado seleccionado,  
   **When** el usuario solicita el detalle,  
   **Then** se presenta el comprobante completo de liquidación con desglose de:
      - Fondo inicial de apertura.
      - Total cobrado por cada medio de pago (Efectivo, Débito, Crédito, Transferencia).
      - Retiros parciales efectuados.
      - Efectivo teórico esperado vs Efectivo real contado en arqueo ciego.
      - Faltante o sobrante liquidado.
3. **Given** el comprobante de cierre de turno en pantalla,  
   **When** el usuario pulsa la opción de imprimir o exportar,  
   **Then** el sistema genera una versión en texto formateado de alta legibilidad apta para impresoras térmicas de 80mm o archivo local.

---

### Edge Cases

- **Cierre con cuentas abiertas en el balneario**: Si existen cuentas o mesas aún abiertas sin cobrar al cerrar el turno, el sistema advierte explícitamente la cantidad de cuentas abiertas pendientes para que el cajero decida si traspasarlas al turno siguiente o cobrarlas antes de cerrar.
- **Corte de energía o cierre inesperado durante el turno**: Al reiniciar la terminal, el sistema debe detectar el turno activo en SQLite WAL y recuperar intacto el estado de fondo inicial, pagos y retiros sin pérdida de información.
- **Arqueo ciego con valores en cero**: Si el cajero ingresa $0 en efectivo en un turno que tuvo cobranzas, el sistema no bloquea el cierre pero exige confirmación explícita y motivo obligatorio para evitar cierres accidentales.
- **Pagos anulados dentro del turno**: Los pagos que hayan sido anulados no deben sumar en la recaudación del medio de pago correspondiente ni computarse como efectivo esperado en el arqueo.
- **Operador diferente en el cierre**: Si un supervisor cierra el turno de un cajero que debió retirarse de urgencia, el sistema registra tanto el operador que abrió el turno como el supervisor que ejecutó el arqueo de cierre.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir registrar la apertura de un turno de caja indicando operador, fecha/hora de inicio y fondo inicial en efectivo (mayor o igual a cero).
- **FR-002**: El sistema DEBE garantizar que solo pueda existir un único turno de caja en estado "Abierto" de forma simultánea en la terminal.
- **FR-003**: Todo cobro registrado en el sistema (Feature 002) mientras exista un turno abierto DEBE quedar vinculado unívocamente a dicho turno para su liquidación.
- **FR-004**: El sistema DEBE permitir el registro de retiros parciales de efectivo (sangrías) con monto, operador, receptor y motivo justificado.
- **FR-005**: El sistema DEBE validar que el monto de cualquier retiro parcial no supere el efectivo neto acumulado en la gaveta en ese momento (Fondo inicial + Cobros en efectivo - Retiros previos).
- **FR-006**: El proceso de arqueo de cierre DEBE ser ciego: la interfaz no debe mostrar los saldos teóricos esperados hasta que el cajero haya confirmado el ingreso de los importes contados físicamente.
- **FR-007**: El sistema DEBE calcular automáticamente la diferencia de caja: `Diferencia = Monto Declarado - Monto Esperado`, identificando el resultado como Exacto ($0), Sobrante ($>0) o Faltante ($<0).
- **FR-008**: Si la diferencia absoluta de caja supera un importe configurable (por defecto $1.000 ARS), el sistema DEBE exigir un motivo o descargo de texto antes de permitir el cierre definitivo.
- **FR-009**: Al confirmar el cierre de turno, el estado DEBE cambiar a "Cerrado", congelando el arqueo de forma inmutable y bloqueando la adición de nuevos pagos o retiros a ese turno.
- **FR-010**: El sistema DEBE permitir consultar el historial completo de turnos (tanto abiertos como cerrados) con filtros por fecha y operador.
- **FR-011**: El sistema DEBE generar un comprobante/resumen de liquidación de turno con formato compacto compatible con impresoras de ticket de 80mm y visualización en pantalla.
- **FR-012**: Si se intenta registrar un pago de cuenta cuando no hay ningún turno de caja abierto, el sistema DEBE notificar al usuario y requerir la apertura previa del turno correspondiente.

---

### Key Entities *(include if feature involves data)*

- **TurnoCaja**: Representa el ciclo de trabajo de un cajero en la terminal.
  - Atributos clave: Identificador único, código visible correlativo (ej: `TRN-20261027-01`), operador de apertura, fecha/hora de inicio, fondo inicial en efectivo, estado (`Abierto`, `Cerrado`), operador de cierre, fecha/hora de cierre, observaciones de cierre.
- **RetiroCaja**: Representa una sangría o extracción de efectivo durante el turno.
  - Atributos clave: Identificador único, turno al que pertenece, monto extraído, fecha/hora, operador que entrega, persona/supervisor que recibe, motivo justificado.
- **ArqueoCierre**: Representa la conciliación final del turno.
  - Atributos clave: Turno asociado, efectivo esperado, efectivo declarado en arqueo ciego, diferencia de efectivo, totales declarados por tarjeta de débito, crédito y transferencia, diferencia total consolidada, justificación de discrepancias.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El operador puede completar la apertura de turno con fondo inicial en menos de 10 segundos.
- **SC-002**: El recuento de arqueo ciego y la visualización de la conciliación de diferencias se completa en menos de 1 minuto por el cajero.
- **SC-003**: El 100% de las discrepancias entre dinero declarado y dinero teórico esperado quedan registradas con fecha, operador y trazabilidad inmutable sin alteración de cobros históricos (Constitución Art. VI).
- **SC-004**: Los retiros parciales de efectivo garantizan que la gaveta no sobrepase límites de seguridad física sin descuadrar el balance final de caja.
- **SC-005**: El sistema opera de forma 100% autónoma y offline en SQLite local con persistencia inmediata tras cada cobro o sangría.

---

## Assumptions

- **Terminal Monopuesto Inicial**: El balneario opera con una terminal de cobro principal en el mostrador/caja del balneario, administrando un turno activo a la vez.
- **Medios de Pago Soportados**: Se mantienen los cuatro medios de cobro estipulados en Feature 002: Efectivo, Tarjeta Débito, Tarjeta Crédito y Transferencia Bancaria/QR.
- **Arqueo Ciego Focalizado en Efectivo**: El efectivo físico requiere conteo de billetes en gaveta; los medios digitales (tarjetas y transferencias) permiten verificación cruzada con el total de cupones/lotes emitidos por el posnet o comprobantes de transferencia.
- **Impresión Local / Formato Texto**: No se requiere conectividad de red con servidores externos; el comprobante de turno se visualiza en interfaz táctil y se puede copiar o emitir hacia puertos locales de impresión.
