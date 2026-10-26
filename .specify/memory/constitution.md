# Sistema de Gestión de Comandas para Balnearios Constitution

**Proyecto:** Sistema de Gestión de Comandas para Balnearios  
**Principio rector:** Construir primero un sistema pequeño, confiable y útil; validar su funcionamiento en condiciones reales; y ampliar sus capacidades sin sacrificar la simplicidad, la integridad ni la mantenibilidad.

## Core Principles

### I. Propósito y Confiabilidad Operativa
El sistema está destinado a gestionar comandas, consumos y cuentas de establecimientos gastronómicos vinculados a balnearios.
- El producto DEBE priorizar en todo momento la confiabilidad operativa, la facilidad de uso y la simplicidad de mantenimiento por sobre funcionalidades secundarias o decorativas.
- El desarrollo DEBE comenzar con la validación de un cliente piloto antes de evolucionar hacia una solución reutilizable para múltiples establecimientos.
*Rationale: Asegura un foco estricto en la utilidad y solidez operativa inmediata en el entorno de explotación real antes de introducir abstracciones complejas.*

### II. Desarrollo Guiado por Especificaciones
Toda funcionalidad DEBE estar respaldada por requisitos explícitos, criterios de aceptación unívocos y pruebas verificables.
- La implementación DEBE seguir un ciclo incremental estricto: especificar, diseñar, implementar, probar y documentar.
- NO SE DEBEN implementar funcionalidades de negocio ni escribir código productivo antes de definir y aprobar las especificaciones correspondientes en Spec Kit.
*Rationale: Previene el desperdicio de desarrollo en suposiciones no validadas y garantiza la trazabilidad entre el problema del negocio y la solución técnica.*

### III. Arquitectura y Tecnología
La aplicación DEBE utilizar tecnologías web para su interfaz, empaquetadas como aplicación de escritorio nativa mediante Tauri.
- La arquitectura base DEBE contemplar:
  - **Tauri** como plataforma de escritorio nativa liviana y segura.
  - **React** y **TypeScript** para la construcción de la interfaz gráfica de usuario.
  - **SQLite** para la persistencia transaccional local.
  - **Rust** para las operaciones nativas del sistema operativo, acceso a hardware y gestión de datos de bajo nivel.
- La lógica de negocio DEBE mantenerse completamente independiente y desacoplada de la interfaz de usuario, de la base de datos subyacente y de los dispositivos de impresión de comandas.
- Las decisiones tecnológicas únicamente PODRÁN modificarse cuando exista una justificación documentada y se evalúen formalmente sus consecuencias y riesgos.
*Rationale: Asegura un stack de alto rendimiento y bajo consumo de recursos en hardware común de balneario, con límites de responsabilidad nítidos entre UI, lógica y hardware.*

### IV. Autonomía Operativa y Resiliencia
Las funciones esenciales del balneario DEBEN operar al 100% sin conexión a internet ni dependencia de servicios externos.
- La integridad de los datos, la recuperación transparente ante fallos o cortes de energía, y las copias de seguridad periódicas DEBEN considerarse requisitos fundamentales no negociables, nunca mejoras opcionales.
- La primera versión DEBE estar orientada al funcionamiento autónomo en una computadora local monopuesto.
- La arquitectura DEBE evitar activamente cualquier decisión de diseño que impida una futura expansión hacia una red de área local (LAN) con múltiples terminales o puestos de trabajo.
*Rationale: Los balnearios operan en entornos donde la conectividad a internet suele ser inestable o ausente; el servicio gastronómico y el cobro no pueden detenerse por caídas de red.*

### V. Modularidad y Simplicidad
El sistema DEBE organizarse en módulos con responsabilidades bien definidas y contratos de interfaz explícitos.
- La arquitectura DEBE priorizar una estructura modular, comprensible y mantenible por un único desarrollador.
- NO SE DEBEN incorporar microservicios, infraestructura distribuida ni dependencias innecesarias sin una necesidad técnica demostrable.
- Cada módulo DEBE poder probarse y verificarse de manera aislada e independiente, garantizando a la vez la coherencia global del sistema.
*Rationale: Minimiza la sobrecarga cognitiva, reduce la probabilidad de regresiones y permite ciclos de iteración rápidos y controlados.*

### VI. Integridad y Trazabilidad
El ciclo de vida comercial del establecimiento DEBE ser consistente, auditable y resistente a errores de operación.
- Las **comandas**, las **cuentas** y los **pagos** DEBEN modelarse y tratarse como entidades conceptualmente diferenciadas en todo el sistema.
- Las operaciones críticas DEBEN ser consistentes, auditables y resistentes a duplicaciones accidentales o dobles envíos.
- Toda anulación y modificación relevante DEBE conservar su trazabilidad histórica (marca temporal, responsable y motivo).
- Los importes y precios históricos registrados en transacciones pasadas NO PUEDEN alterarse retroactivamente bajo ningún concepto por cambios en la lista de precios o configuración comercial.
- La interfaz gráfica NUNCA DEBE ser la única capa responsable de validar operaciones críticas; las reglas de validación DEBEN residir de forma estricta en el núcleo de la lógica de negocio.
*Rationale: Protege los ingresos del establecimiento, previene inconsistencias contables y asegura auditorías fidedignas de turnos y comandas.*

### VII. Experiencia de Usuario Gastronómica
La interfaz DEBE ser visualmente clara, accesible y altamente eficiente para el ritmo dinámico de un entorno gastronómico.
- Se DEBEN priorizar la legibilidad en condiciones variables de luz, la velocidad de respuesta en cada interacción, la prevención de errores de carga y la consistencia visual de los componentes.
- Las decisiones estéticas NO DEBEN comprometer la confiabilidad operativa ni ralentizar las tareas operativas cotidianas (toma de pedidos, cierre de mesas, cobranza).
*Rationale: En picos de alta demanda en el balneario, la agilidad y precisión de la UI son esenciales para evitar colas, confusiones en comandas y pérdidas de tiempo.*

### VIII. Alcance Incremental y Evolución
La primera versión del producto DEBE tener como objetivo prioritario validar su valor en un balneario real en condiciones de producción.
- Las funcionalidades DEBEN priorizarse rigurosamente según su valor operativo real, su viabilidad técnica y las necesidades confirmadas del cliente piloto.
- Toda hipótesis no verificada DEBE identificarse de forma explícita antes de planificar o iniciar su implementación.
- Las particularidades comerciales o flujos propios de un establecimiento DEBEN resolverse preferentemente mediante parametrización y configuración, y NO mediante bifurcaciones (forks) en el código base.
- Toda expansión o mejora posterior DEBE preservar la estabilidad y el rendimiento del núcleo existente.
*Rationale: Maximiza el retorno del esfuerzo de desarrollo validando el producto en el terreno antes de agregar capas de complejidad innecesaria.*

### IX. Calidad y Responsabilidad de la IA
El desarrollo asistido por IA DEBE ceñirse a estándares verificables de calidad, transparencia y rigor técnico.
- Ninguna tarea se considerará completa sin verificar formalmente sus criterios de aceptación y ejecutar las pruebas automatizadas o de integración pertinentes.
- La IA DEBE comunicar con total transparencia los errores detectados, las limitaciones técnicas, las decisiones pendientes y las pruebas que no haya podido ejecutar.
- La IA NO PUEDE declarar una funcionalidad como terminada basándose únicamente en la generación de código sin validación empírica.
- Toda incorporación de dependencias externas, migraciones de base de datos, alteraciones de arquitectura o modificaciones a las especificaciones DEBEN ser justificables, documentadas y revisables por el responsable del proyecto.
*Rationale: Asegura un código fuente limpio, confiable y verificable, evitando alucinaciones de completitud o deuda técnica oculta.*

## Governance

### Precedencia Constitucional (Artículo X)
Esta Constitución establece los principios fundamentales y no negociables del proyecto.
- Las especificaciones funcionales (`spec.md`), los diseños técnicos (`plan.md`) y los planes de trabajo (`tasks.md`) DEBEN respetar rigurosamente los principios aquí definidos.
- Si surge cualquier conflicto entre una necesidad operativa o técnica y los principios de esta Constitución, el conflicto DEBE señalarse explícitamente y resolverse formalmente antes de continuar con la implementación.

### Procedimiento de Modificación y Enmienda
Toda modificación o enmienda de esta Constitución DEBE documentarse y aprobarse expresamente por el responsable del proyecto mediante el comando `/speckit-constitution`. No se permiten cambios tácitos o implícitos.

### Política de Versionado
El versionado de la Constitución se rige por las reglas de Versionado Semántico (`MAJOR.MINOR.PATCH`):
- **MAJOR**: Cambios sustanciales que eliminen, contradigan o redefinan de manera incompatible los principios vigentes de gobernanza o arquitectura.
- **MINOR**: Incorporación de nuevos principios, secciones temáticas o ampliación material de las directrices existentes.
- **PATCH**: Correcciones tipográficas, refinamientos de redacción, clarificaciones menores que no alteren el sentido normativo de los artículos.

### Revisión de Cumplimiento
En cada fase de diseño, análisis cruzado (`/speckit-analyze`) e implementación (`/speckit-converge`), se verificará el cumplimiento estricto de las directrices normativas (cláusulas DEBE/MUST, NO DEBE/MUST NOT). Cualquier violación no justificada constituirá un bloqueo crítico.

**Version**: 1.0.0 | **Ratified**: 2026-10-26 | **Last Amended**: 2026-10-26
