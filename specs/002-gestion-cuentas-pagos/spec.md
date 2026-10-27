# Feature Specification: Gestión de Cuentas y Pagos

**Feature Branch**: `002-gestion-cuentas-pagos`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Gestión de Cuentas y Pagos (consolidación de consumos por ubicación/comanda, división de cuenta y registro de cobros en efectivo, débito o transferencia)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consolidación de Comandas en Cuenta de Consumo (Priority: P1)

Como cajero o empleado del balneario, quiero consolidar los consumos y comandas activas de una ubicación física (mesa, carpa, sombrilla) en una cuenta unificada, para que el cliente pueda visualizar el total de su consumo y saber exactamente cuánto debe abonar.

**Why this priority**: Es el paso indispensable que vincula los pedidos gastronómicos tomados a lo largo del día con la cobranza final. Sin consolidación de cuenta, no es posible determinar el total adeudado ni proceder al cobro.

**Independent Test**: Puede probarse de forma independiente seleccionando una carpa con comandas activas registradas en el módulo de comandas, solicitando "Cerrar mesa / Abrir cuenta", verificando que el sistema genere una `Cuenta` con el importe total exacto de las comandas y un `saldo_pendiente` inicial idéntico al total.

**Acceptance Scenarios**:

1. **Given** una ubicación ("Carpa 12") con una o más comandas activas registradas, **When** el operador solicita generar la cuenta de consumo, **Then** el sistema crea la entidad `Cuenta` en estado `Abierta`, asociando las comandas correspondientes, y calcula el `total` y `saldo_pendiente` como la suma exacta de los importes de los pedidos activos.
2. **Given** una ubicación que no tiene ninguna comanda registrada o cuyas comandas ya fueron pagadas en una cuenta anterior, **When** el operador intenta abrir una cuenta, **Then** el sistema bloquea la acción e informa que no existen consumos pendientes por liquidar en esa ubicación.
3. **Given** una cuenta ya creada en estado `Abierta`, **When** se consulta el detalle de la cuenta, **Then** el sistema muestra el desglose de comandas e ítems incluidos, la fecha/hora de apertura y el saldo pendiente a abonar.

---

### User Story 2 - Registro de Pagos Multimedio (Efectivo, Débito, Transferencia) (Priority: P1)

Como cajero del balneario, quiero asentar los cobros realizados a los clientes registrando el medio de pago utilizado (efectivo con cálculo de vuelto, débito o transferencia bancaria local), para deducir el saldo pendiente y documentar los ingresos del turno.

**Why this priority**: Los clientes abonan con diferentes medios de pago según su conveniencia. Es fundamental registrar el medio exacto y calcular el vuelto en efectivo de forma inmediata para evitar errores de caja.

**Independent Test**: Puede probarse registrando un cobro de $5.000 en efectivo para una cuenta de $8.500 recibiendo $10.000, comprobando que el sistema informe el vuelto exacto de $5.000, descuente $5.000 del saldo pendiente (dejándolo en $3.500) y registre el pago de forma auditable.

**Acceptance Scenarios**:

1. **Given** una cuenta con saldo pendiente de $8.500, **When** el operador registra un pago en efectivo de $5.000 ingresando un importe entregado de $10.000, **Then** el sistema calcula el vuelto de $5.000, asienta el registro de pago por $5.000 y actualiza el saldo pendiente de la cuenta a $3.500.
2. **Given** una cuenta con saldo pendiente, **When** el operador asienta un pago con medio electrónico físico (*Tarjeta Débito*, *Tarjeta Crédito* o *Transferencia*), **Then** el sistema permite registrar opcionalmente un número de cupón o referencia de comprobante y deduce el importe del saldo pendiente.
3. **Given** un intento de pago con monto igual o inferior a cero, **When** el operador intenta confirmar el cobro, **Then** el sistema bloquea la operación e indica que el monto debe ser un importe positivo.
4. **Given** un intento de cobro con importe mayor al saldo pendiente restante, **When** el operador intenta asentar el pago, **Then** el sistema impide registrar un cobro excedente (el monto imputado nunca puede superar el saldo pendiente).

---

### User Story 3 - División de Cuenta entre Comensales (Priority: P2)

Como cajero del balneario, quiero calcular la división del saldo de la cuenta en partes iguales o aceptar cobros fraccionados, para atender a grupos de clientes que desean abonar su consumo por separado.

**Why this priority**: En balnearios es una práctica habitual que varias familias o amigos compartan una carpa o mesa grande y soliciten dividir la cuenta en partes iguales con distintos medios de pago.

**Independent Test**: Probar dividiendo una cuenta de $12.000 en 3 partes iguales; cobrar la primera parte con débito ($4.000), la segunda con transferencia ($4.000) y la tercera con efectivo ($4.000), verificando que tras cada pago el saldo disminuya y que al tercer pago la cuenta pase a estado `Pagada`.

**Acceptance Scenarios**:

1. **Given** una cuenta abierta con saldo pendiente de $12.000, **When** el operador solicita dividir la cuenta en 3 partes, **Then** el sistema calcula y sugiere el valor exacto por cuota ($4.000) y permite cobrar cada parte con el medio de pago que elija cada cliente.
2. **Given** una cuenta en proceso de cobro fraccionado, **When** el operador asienta el último pago que cubre el saldo restante exactamente a $0, **Then** el sistema cambia automáticamente el estado de la cuenta a `Pagada`.

---

### User Story 4 - Cierre Operativo y Liberación de Ubicación Física (Priority: P2)

Como encargado o mozo del balneario, quiero formalizar el cierre definitivo de la cuenta una vez que ha sido pagada en su totalidad y liberar la ubicación física (mesa, carpa o sombrilla), para dejarla disponible para nuevos clientes.

**Why this priority**: Garantiza la rotación ordenada del espacio físico en el balneario y evita que una ubicación quede bloqueada o que se libere por error cuando aún existe deuda impaga.

**Independent Test**: Intentar liberar una ubicación con saldo pendiente mayor a $0 (el sistema debe impedirlo terminantemente); luego, una vez que la cuenta llega a saldo $0, confirmar la liberación y verificar que la ubicación cambie a estado disponible y la cuenta pase a `Cerrada/Liquidada`.

**Acceptance Scenarios**:

1. **Given** una cuenta con saldo pendiente mayor a cero ($ > 0$), **When** el operador intenta cerrar la cuenta o liberar la ubicación, **Then** el sistema bloquea la acción e informa que no se puede liberar una ubicación con saldo impago pendiente.
2. **Given** una cuenta en estado `Pagada` (saldo pendiente igual a $0,00), **When** el operador confirma la liberación de la ubicación, **Then** la cuenta pasa a estado `Cerrada`, las comandas vinculadas quedan selladas en estado terminal y la ubicación queda libre para recibir nuevas comandas.

---

### User Story 5 - Anulación de Pagos y Auditoría de Arqueo de Turno (Priority: P3)

Como encargado o administrador del balneario, quiero poder anular un pago registrado erróneamente con motivo justificado obligatorio y consultar el total recaudado por medio de pago durante el turno, para asegurar un arqueo de caja transparente y confiable.

**Why this priority**: En la agilidad del mostrador pueden ocurrir equivocaciones de tipeo o de medio de pago. La anulación auditada y el arqueo por medio de pago son esenciales para la integridad contable (Constitución Art. VI).

**Independent Test**: Anular un pago de $5.000 con motivo "Error de medio de pago: era transferencia y se marcó efectivo", comprobando que el pago pase a `Anulado`, el saldo de la cuenta aumente en $5.000, la auditoría quede registrada y el total de efectivo del turno se reduzca en $5.000.

**Acceptance Scenarios**:

1. **Given** una cuenta con un pago asentado, **When** el operador solicita anular el pago e ingresa un motivo explícito de al menos 4 caracteres, **Then** el sistema marca el pago como `Anulado` (baja lógica), restaura el importe al saldo pendiente de la cuenta y registra la marca temporal, operador y motivo en la auditoría inmutable.
2. **Given** un intento de anulación de pago sin motivo justificado, **When** el operador intenta enviar la anulación, **Then** el sistema rechaza la operación.
3. **Given** un turno de trabajo con cobros realizados, **When** el operador accede al resumen de arqueo de caja, **Then** el sistema totaliza los cobros activos agrupados por medio de pago (*Efectivo, Débito, Crédito, Transferencia*) excluyendo los pagos anulados.
4. **Given** una cuenta abierta por error sin cobros activos registrados, **When** el operador solicita anular la cuenta e ingresa un motivo justificado (mínimo 4 caracteres), **Then** el sistema cambia su estado a `Anulada`, registra la baja lógica con operador y motivo, y desvincula las comandas para que queden disponibles para otra liquidación. Si la cuenta ya tiene pagos activos, la anulación se bloquea hasta que dichos pagos sean cancelados primero.

---

### Edge Cases

- **Pago con vuelto en efectivo**: Si un cliente debe $3.200 y entrega un billete de $5.000, el monto imputado a la cuenta DEBE ser exactamente $3.200 y el vuelto informado $1.800.
- **Pagos concurrentes o doble clic**: El botón de confirmación de pago debe deshabilitarse durante la transacción para evitar registrar dos veces el mismo cobro.
- **Cierre inesperado durante la transacción**: Si la aplicación se apaga en pleno proceso de cobro, la persistencia atómica en SQLite garantiza que el pago no quede registrado sin haber actualizado el saldo de la cuenta (propiedades ACID).
- **Redondeo de centavos en división de cuentas**: Si una cuenta de $10.000 se divide en 3 partes ($3.333,33), la última cuota debe ajustarse automáticamente para absorber la diferencia de centavos y totalizar exactamente $10.000 sin saldos residuales huérfanos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir crear una `Cuenta` de consumo consolidando una o más comandas activas asociadas a una misma ubicación física del establecimiento.
- **FR-002**: El sistema DEBE mantener la entidad `Cuenta` conceptual y físicamente diferenciada de la `Comanda` y del `Pago` (Constitución Art. VI).
- **FR-003**: El sistema DEBE calcular automáticamente el total bruto de la cuenta sumando los importes vigentes de las comandas asociadas y mantener el saldo pendiente actualizado en tiempo real (`saldo_pendiente = total - SUM(pagos_activos)`).
- **FR-004**: El sistema DEBE gestionar el ciclo de vida de la cuenta mediante los estados:
  - `Abierta`: Cuenta generada con saldo pendiente por abonar.
  - `Pagada`: Cuenta cuyo saldo pendiente ha llegado exactamente a cero ($0,00).
  - `Cerrada`: Cuenta liquidada operativamente con ubicación liberada.
  - `Anulada`: Cuenta dada de baja administrativamente con justificación obligatoria.
- **FR-005**: El sistema DEBE permitir registrar cobros contra una cuenta activa especificando: medio de pago (`Efectivo`, `Tarjeta Débito`, `Tarjeta Crédito`, `Transferencia Local`), monto a imputar (> 0), fecha/hora, operador y referencia opcional.
- **FR-006**: Para cobros en `Efectivo`, el sistema DEBE permitir ingresar el importe entregado por el cliente y calcular automáticamente el cambio/vuelto exacto a devolver.
- **FR-007**: El sistema DEBE rechazar cualquier intento de registrar un pago con monto menor o igual a cero.
- **FR-008**: El sistema DEBE impedir que el monto imputado de un pago supere el saldo pendiente actual de la cuenta a abonar.
- **FR-009**: El sistema DEBE permitir múltiples pagos parciales sucesivos sobre una misma cuenta hasta completar la totalidad del saldo.
- **FR-010**: El sistema DEBE proveer una herramienta de división equitativa del saldo entre N partes (N >= 2), sugiriendo el importe de cada cuota y ajustando diferencias de redondeo en la cuota final.
- **FR-011**: El sistema DEBE prohibir taxativamente el cierre de la cuenta y la liberación de la ubicación si la cuenta posee un saldo pendiente mayor a cero ($ > 0,00$).
- **FR-012**: El sistema DEBE permitir la anulación de un cobro previamente registrado exigiendo obligatoriamente un motivo justificado (mínimo 4 caracteres), restaurando el saldo pendiente de la cuenta.
- **FR-013**: Las anulaciones de pagos DEBEN registrarse como bajas lógicas (*soft-cancel*) en la base de datos y generar un registro inmutable en `auditoria_pagos`, prohibiendo la eliminación física (`DELETE`) de registros.
- **FR-014**: El sistema DEBE persistir los cobros y la actualización de saldo de forma transaccional y atómica en SQLite, asegurando consistencia total ante caídas o cortes de suministro eléctrico.
- **FR-015**: El sistema DEBE emitir un resumen de arqueo de turno que discrimine los cobros netos por medio de pago (total efectivo, total débito, total crédito, total transferencias) y la cantidad de operaciones anuladas.
- **FR-016**: El sistema DEBE funcionar al 100% de manera autónoma y offline en la estación local, sin depender de pasarelas de pago online ni conexión a internet (Constitución Art. IV).

### Key Entities *(include if feature involves data)*

- **Cuenta**: Representa la liquidación consolidada de consumos de una ubicación o grupo.
  - *Atributos*: ID correlativo, Código visible (ej. `CTA-0001`), Ubicación ID, Ubicación Nombre, Estado (`Abierta`, `Pagada`, `Cerrada`, `Anulada`), Total a pagar, Saldo pendiente, Fecha/hora de apertura, Fecha/hora de cierre, Operador responsable.
- **Pago**: Representa una transacción individual de cobro aplicada a una cuenta.
  - *Atributos*: ID único, Cuenta ID, Medio de pago (`Efectivo`, `Tarjeta Débito`, `Tarjeta Crédito`, `Transferencia`), Monto imputado, Monto entregado (para efectivo), Vuelto entregado, Referencia externa (número de cupón/ticket posnet/transferencia), Estado (`Activo`, `Cancelado`), Motivo de anulación (si cancelado), Operador, Fecha/hora de registro.
- **CuentaComanda**: Tabla de asociación entre la `Cuenta` y las `Comandas` incluidas en la liquidación.
- **AuditoriaPagos**: Registro inmutable de transacciones de cobro y anulaciones con marca temporal, operador y justificación.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El operador puede registrar un cobro y obtener el saldo actualizado o vuelto en menos de 5 segundos de interacción en pantalla.
- **SC-002**: 100% de consistencia contable: en todo momento el saldo pendiente de una cuenta equivale exactamente a `total - SUM(pagos activos)`.
- **SC-003**: Cero liberaciones de ubicaciones con saldo impago pendiente.
- **SC-004**: El 100% de las anulaciones de pagos cuentan con registro auditable inmutable de usuario, fecha/hora y motivo explícito.
- **SC-005**: La consulta del arqueo de caja y totales por medio de pago responde en menos de 500 ms en la estación local.
- **SC-006**: Cero pagos duplicados accidentales ocasionados por doble clic del operador.

## Assumptions

- **A-001**: La terminal de cobro opera en la misma computadora local monopuesto donde se gestionan las comandas.
- **A-002**: Los cobros con tarjeta o transferencia se realizan mediante terminales físicas externas (POS / terminal bancaria / app bancaria del cliente); el sistema registra el cobro localmente para el arqueo y conciliación interna.
- **A-003**: En esta etapa inicial, los precios y totales ya incluyen los impuestos comerciales correspondientes. La facturación electrónica fiscal con AFIP/ARCA queda desacoplada para una fase posterior especializada.
- **A-004**: Los operadores cuentan con una sesión abierta identificada para la trazabilidad de los cobros y cierres de turno.

