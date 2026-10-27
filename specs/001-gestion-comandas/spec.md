# Feature Specification: Gestión de Comandas

**Feature Branch**: `001-gestion-comandas`

**Created**: 2026-10-26

**Status**: Draft

**Input**: User description: "Definir la primera especificación funcional del sistema de gestión para un balneario con servicio gastronómico. Contexto: escritorio, offline-first, monopuesto. Alcance: creación, ubicación, productos, importes, consulta, adición incremental, anulación con trazabilidad, estados, validaciones y resiliencia ante cierres inesperados."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Creación y Registro Inicial de Comanda (Priority: P1)

Como empleado del balneario, quiero registrar un nuevo pedido gastronómico asociándolo a una ubicación física del establecimiento (mesa, carpa, sombrilla, reposera o mostrador) e incorporando los productos solicitados con sus cantidades y notas de preparación, para que el pedido quede formalizado y registrado sin errores ni pérdidas.

**Why this priority**: Es el flujo fundamental del negocio. Sin la capacidad de crear y registrar una comanda con sus productos y ubicación, el establecimiento no puede operar gastronómicamente ni dar inicio al ciclo de consumo.

**Independent Test**: Puede probarse de manera autónoma seleccionando una ubicación existente (ej. "Carpa 12"), agregando productos del catálogo (ej. "2 Licuados de Frutilla" y "1 Tostado Mixto"), confirmando el pedido y verificando que el sistema genere una comanda en estado `Abierta` con identificador único correlativo, fecha/hora y total calculado correctamente.

**Acceptance Scenarios**:

1. **Given** un operador en el sistema y un catálogo de productos con precios vigentes, **When** el operador selecciona una ubicación ("Carpa 12"), agrega productos con cantidades enteras positivas y confirma la comanda, **Then** el sistema persiste la comanda con estado `Abierta`, un identificador único correlativo, fecha/hora de creación, los ítems asociados con sus precios unitarios congelados y el total correctamente calculado.
2. **Given** una comanda en proceso de carga sin productos agregados, **When** el operador intenta confirmarla, **Then** el sistema bloquea la acción y muestra un mensaje indicando que la comanda debe tener al menos un ítem con cantidad mayor a cero.
3. **Given** un producto agregado a la comanda, **When** el operador ingresa una observación específica de preparación (ej. "sin hielo", "término medio"), **Then** el sistema almacena dicha observación vinculada al ítem correspondiente.

---

### User Story 2 - Consulta y Filtrado de Comandas Existentes (Priority: P1)

Como empleado o encargado del balneario, quiero consultar el listado de comandas activas e históricas con filtros por estado y ubicación, para conocer rápidamente los pedidos en curso, su composición y su estado actual.

**Why this priority**: Esencial para la visibilidad operativa del personal en salón, barra y mostrador, permitiendo saber qué comandas están pendientes y verificar pedidos sin recurrir a anotaciones manuales en papel.

**Independent Test**: Puede probarse registrando múltiples comandas en diferentes ubicaciones y estados, accediendo a la vista de consulta, aplicando filtros por estado (ej. solo `Abiertas`) y por ubicación (ej. "Sombrilla 4"), verificando que el listado responda de forma inmediata con los datos exactos.

**Acceptance Scenarios**:

1. **Given** un conjunto de comandas registradas en el sistema, **When** el operador accede a la consulta de comandas, **Then** el sistema presenta un listado con el identificador de comanda, ubicación, fecha/hora de creación, cantidad de ítems, estado actual e importe total.
2. **Given** el listado de comandas, **When** el operador filtra por estado (ej. "Abierta") o por término de búsqueda de ubicación (ej. "Mesa 3"), **Then** el sistema muestra únicamente las comandas que coinciden con los criterios seleccionados.
3. **Given** una comanda en el listado, **When** el operador la selecciona para detalle, **Then** el sistema despliega el desglose completo de ítems, cantidades, precios unitarios históricos, observaciones, subtotales y total consolidado.

---

### User Story 3 - Incorporación Incremental de Productos a Comanda Abierta (Priority: P2)

Como empleado del balneario, quiero agregar nuevos productos a una comanda que ya se encuentra abierta, para atender pedidos adicionales de clientes durante su estadía sin abrir comandas dispersas ni perder la cuenta unificada.

**Why this priority**: En un balneario los clientes permanecen varias horas en carpas, mesas o sombrillas y realizan pedidos escalonados. La adición incremental refleja la dinámica natural del servicio.

**Independent Test**: Puede probarse abriendo una comanda, registrando un primer consumo, y posteriormente añadiendo una segunda ronda de productos; se verifica que los nuevos ítems se incorporen con su marca temporal, el total se actualice y los ítems previos permanezcan intactos.

**Acceptance Scenarios**:

1. **Given** una comanda existente en estado `Abierta`, **When** el operador selecciona la comanda, agrega productos adicionales válidos y confirma la adición, **Then** el sistema incorpora las nuevas líneas de productos, registra la hora de la adición, actualiza el total de la comanda y mantiene inalterados los ítems previamente ingresados.
2. **Given** una comanda en estado `Cerrada` o `Anulada`, **When** el operador intenta incorporar nuevos productos, **Then** el sistema impide la edición e informa que no se permiten modificaciones en comandas cerradas o anuladas.

---

### User Story 4 - Modificación y Anulación con Trazabilidad Obligatoria (Priority: P2)

Como encargado o empleado del balneario, quiero poder anular una comanda completa o cancelar un ítem individual cuando un cliente desista o haya un error de carga, ingresando obligatoriamente una justificación, para mantener la transparencia administrativa y evitar fraudes o descuadres.

**Why this priority**: Los errores de tipeo y las cancelaciones de clientes ocurren a diario. La trazabilidad y justificación obligatoria son exigencias no negociables impuestas por la Constitución del proyecto para proteger la integridad operativa.

**Independent Test**: Puede probarse intentando anular una comanda abierta sin ingresar motivo (debe ser rechazada) y luego ingresando un motivo explícito; se verifica que la comanda pase a estado `Anulada`, el motivo y responsable queden registrados, y la comanda no pueda reactivarse ni editarse más.

**Acceptance Scenarios**:

1. **Given** una comanda en estado `Abierta`, **When** el operador solicita su anulación e introduce un motivo explícito (ej. "Cliente se retira por tormenta"), **Then** el sistema cambia el estado a `Anulada`, registra la baja lógica, el usuario actuante, la marca temporal y el motivo, impidiendo cualquier edición futura.
2. **Given** una solicitud de anulación de comanda o de cancelación de ítem, **When** el campo de motivo se encuentra vacío o solo con espacios en blanco, **Then** el sistema rechaza la operación e impide proceder hasta ingresar una justificación válida.
3. **Given** una comanda en estado `Abierta` con múltiples ítems, **When** el operador anula un ítem específico justificando el motivo, **Then** el ítem se marca como cancelado (baja lógica), su importe se resta del total de la comanda, y se preserva el registro del ítem cancelado para auditoría.

---

### User Story 5 - Resiliencia ante Cierres Inesperados y Fallos de Energía (Priority: P3)

Como responsable del establecimiento, quiero que cualquier comanda confirmada permanezca intacta y recuperable aun si la computadora sufre un corte repentino de energía o un cierre abrupto de la aplicación, para garantizar la continuidad operativa en la temporada sin pérdidas de datos.

**Why this priority**: El entorno de balneario presenta fluctuaciones eléctricas y condiciones adversas. La resiliencia local y la persistencia confiable son requisitos esenciales de confiabilidad (Constitución Artículo IV).

**Independent Test**: Puede probarse simulando la terminación forzada del proceso de la aplicación inmediatamente tras la confirmación de una comanda; al reiniciar la aplicación, la comanda confirmada debe figurar intacta en el listado local.

**Acceptance Scenarios**:

1. **Given** una comanda cuya confirmación fue notificada con éxito al operador, **When** la aplicación experimenta un cierre inesperado o corte de suministro eléctrico, **Then** al reiniciar la aplicación la comanda se encuentra en la base de datos local con todos sus ítems y montos exactamente como fueron registrados.
2. **Given** una comanda que se encontraba en edición en pantalla pero no había sido confirmada, **When** se produce un corte abrupto, **Then** al reiniciar el sistema la base de datos no contiene registros corruptos, duplicados ni comandas huérfanas sin ubicación o sin ítems.

---

### Edge Cases

- **Ubicación con comanda abierta preexistente**: Si el operador intenta abrir una comanda en una ubicación que ya posee una comanda `Abierta`, el sistema advertirá claramente al operador mostrando la comanda activa existente y solicitando confirmación si desea agregar productos a la comanda actual o abrir una comanda adicional para esa ubicación (ej. subgrupo de clientes en una misma carpa).
- **Modificación posterior de precios en catálogo**: Si el precio de un producto cambia en la configuración comercial del establecimiento mientras existen comandas abiertas o históricas, los ítems ya registrados en comandas previas DEBEN conservar inalterable el precio unitario original que tenían al momento del registro.
- **Prevención de doble clic / envíos simultáneos**: Si el operador pulsa repetidamente o rápidamente el botón de confirmar, el sistema debe deshabilitar la acción de inmediato durante el guardado para evitar generar dos comandas duplicadas idénticas.
- **Cantidades inválidas**: Si se ingresa una cantidad menor o igual a cero, o valores decimales en productos que no admiten fraccionamiento, el sistema debe rechazar la entrada.
- **Caracteres especiales en observaciones**: Las notas de preparación deben sanitizarse para admitir texto libre (tildes, comas, guiones) sin provocar errores de almacenamiento ni desbordes en las vistas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir crear una nueva comanda vinculándola obligatoriamente a una ubicación del establecimiento (mesa, carpa, sombrilla, reposera o mostrador).
- **FR-002**: El sistema DEBE asignar a cada comanda creada un identificador único correlativo, fecha y hora de creación, y usuario o sesión responsable.
- **FR-003**: El sistema DEBE exigir que toda comanda contenga al menos un ítem de producto válido con cantidad entera positiva (> 0) para poder ser confirmada.
- **FR-004**: El sistema DEBE permitir asociar un texto de observación o nota de preparación opcional a cada ítem individual de la comanda (ej. "sin sal", "aderezo aparte").
- **FR-005**: El sistema DEBE congelar el precio unitario del producto al momento de su incorporación al ítem de la comanda, impidiendo que variaciones futuras en el catálogo comercial modifiquen retroactivamente importes históricos.
- **FR-006**: El sistema DEBE calcular automáticamente el subtotal de cada ítem (cantidad × precio unitario congelado) y el importe total consolidado de la comanda.
- **FR-007**: El sistema DEBE gestionar el ciclo de vida de la comanda mediante los siguientes estados formales:
  - `Borrador`: Comanda en preparación local por el operador antes de su confirmación inicial.
  - `Abierta`: Comanda confirmada y activa en el sistema, habilitada para recibir adiciones de productos.
  - `Cerrada`: Comanda finalizada operativamente, bloqueada contra modificaciones o adiciones.
  - `Anulada`: Comanda dada de baja administrativamente por motivo justificado.
- **FR-008**: El sistema DEBE permitir incorporar nuevos ítems a una comanda en estado `Abierta`, recalculando el importe total y registrando la fecha/hora de la adición, sin alterar los ítems previos.
- **FR-009**: El sistema DEBE rechazar cualquier intento de agregar productos o modificar ítems en comandas con estado `Cerrada` o `Anulada`.
- **FR-010**: El sistema DEBE permitir la anulación de una comanda `Abierta`, exigiendo obligatoriamente el ingreso de un motivo explícito de anulación y registrando la fecha/hora y usuario responsable.
- **FR-011**: El sistema DEBE registrar las anulaciones como bajas lógicas (soft-cancel), conservando íntegro el registro en la base de datos para auditoría histórica.
- **FR-012**: El sistema DEBE permitir la cancelación de un ítem individual dentro de una comanda `Abierta`, exigiendo un motivo textual de cancelación, recalculando el total de la comanda y conservando la trazabilidad del ítem cancelado.
- **FR-013**: El sistema DEBE permitir la consulta de comandas registradas, proveyendo filtros por estado (`Abierta`, `Cerrada`, `Anulada`) y búsqueda o filtrado por ubicación.
- **FR-014**: El sistema DEBE persistir las operaciones de guardado de comandas de manera atómica a nivel local, garantizando que ante un cierre abrupto no se generen registros corruptos ni se pierdan comandas confirmadas.
- **FR-015**: El sistema DEBE implementar mecanismos de prevención de duplicación (idempotencia y bloqueo de interfaz durante la confirmación) para evitar la creación accidental de comandas idénticas por doble pulsación.
- **FR-016**: El sistema DEBE mantener la entidad `Comanda` estrictamente desacoplada de la `Cuenta` de consumo y del `Pago`, limitando su alcance al registro y seguimiento de pedidos gastronómicos.

### Key Entities *(include if feature involves data)*

- **Comanda**: Representa el pedido formalizado en el balneario.
  - *Atributos clave*: ID de comanda (correlativo único), ID de Ubicación, Estado (`Borrador`, `Abierta`, `Cerrada`, `Anulada`), Fecha/hora de creación, Fecha/hora de cierre o anulación, Usuario responsable, Importe total, Motivo de anulación (si fue anulada).
- **ItemComanda**: Representa cada producto individual solicitado dentro de la comanda.
  - *Atributos clave*: ID de ítem, ID de comanda, ID de Producto de referencia, Nombre del producto congelado al momento del pedido, Cantidad (entero positivo), Precio unitario histórico (congelado), Subtotal calculado, Observación de preparación (opcional), Estado del ítem (`Activo`, `Cancelado`), Motivo de cancelación (si aplica), Fecha/hora de incorporación.
- **Ubicación (Entidad de Referencia)**: Representa el espacio físico del establecimiento donde se entrega el consumo.
  - *Atributos clave referenciados*: ID de ubicación, Tipo (Mesa, Carpa, Sombrilla, Reposera, Mostrador), Código/Número identificador (ej. "Carpa 14", "Sombrilla 8").
- **Producto (Entidad de Referencia)**: Representa el artículo del catálogo gastronómico.
  - *Atributos clave referenciados*: ID de producto, Nombre comercial, Categoría, Precio de venta vigente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El operador puede completar y confirmar la carga de una nueva comanda con hasta 5 productos en menos de 20 segundos de interacción con la interfaz.
- **SC-002**: El 100% de los precios unitarios y subtotales de las comandas registradas se mantienen inalterados tras modificaciones posteriores de la lista general de precios de productos.
- **SC-003**: Cero pérdida de datos o registros corruptos en comandas confirmadas ante cortes simulados de energía o cierres forzados de la aplicación.
- **SC-004**: El 100% de las anulaciones de comandas o cancelaciones de ítems cuentan con registro auditable no borrable de usuario, marca temporal y motivo justificado.
- **SC-005**: La consulta y filtrado del listado de comandas responde en menos de 1 segundo en estaciones locales con un histórico acumulado de hasta 10.000 comandas.
- **SC-006**: Cero duplicaciones accidentales de comandas ocasionadas por doble clic o pulsaciones rápidas consecutivas en la confirmación.

## Assumptions

- **A-001**: La aplicación opera de forma exclusivamente local en una computadora de escritorio (monopuesto), sin requerir conexión a internet ni servidores externos.
- **A-002**: El catálogo de productos gastronómicos y el mapa o listado de ubicaciones físicas del balneario se configuran previamente o se inyectan mediante un catálogo base de referencia para el funcionamiento de este módulo.
- **A-003**: La sesión operativa actual cuenta con un usuario identificado (operador o cajero de turno) que se asocia a la creación y auditoría de cada comanda.
- **A-004**: La liquidación consolidada de la cuenta, la emisión de comprobantes fiscales y los medios de pago (efectivo, débito, transferencias) se gestionarán en un módulo posterior diferenciado (`Gestión de Cuentas y Pagos`), manteniéndose desacoplados de la comanda según el Artículo VI de la Constitución.
- **A-005**: La impresión física de comandas a impresoras térmicas de cocina o barra se incorporará a través de un adaptador de hardware independiente en una etapa posterior, manteniendo la lógica de negocio desacoplada de los dispositivos físicos.

## Hipótesis y Preguntas Abiertas

- **Hipótesis H-001 (Múltiples comandas por ubicación)**: Se asume que una misma ubicación (ej. Carpa 5) puede tener más de una comanda abierta simultánea para atender a subgrupos de clientes que comparten el espacio. Para prevenir errores, el sistema advertirá al operador si ya existe una comanda abierta al seleccionar la ubicación.
- **Hipótesis H-002 (Permisos de anulación iniciales)**: En esta primera versión, cualquier operador en turno puede anular una comanda o ítem siempre que ingrese el motivo obligatorio de justificación. La introducción de claves de supervisor o perfiles jerárquicos se posterga para la etapa de control de acceso.
- **Hipótesis H-003 (Ciclo de vida operativo de comanda)**: Se asume que el ciclo de vida básico de la comanda requiere los estados `Borrador`, `Abierta`, `Cerrada` y `Anulada`. Los estados logísticos intermedios de cocina ("En preparación", "Listo para despacho") podrán evaluarse según la necesidad del cliente piloto en fases subsiguientes.

