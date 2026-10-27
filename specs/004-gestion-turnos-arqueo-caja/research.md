# Research & Technical Decisions: Gestión de Turnos de Caja y Arqueo Ciego

**Feature**: `004-gestion-turnos-arqueo-caja`  
**Date**: 2026-10-27  
**Engine**: SQLite 3 (WAL mode) + Tauri IPC + React/TypeScript

---

## 1. Concurrencia de Turnos y Restricción de Único Turno Abierto (FR-002)

### Contexto
El balneario opera con una terminal de cobro física principal en la caja/barra. El sistema debe impedir estrictamente que dos cajeros abran turnos superpuestos en la misma base de datos, evitando desvíos contables y ambigüedades en la liquidación del dinero.

### Opciones Consideradas
1. **Validación exclusiva a nivel de aplicación (Rust/TypeScript)**: Verificar `SELECT COUNT(*) FROM turnos_caja WHERE estado = 'Abierto'` antes de insertar.
   - *Riesgo*: Condiciones de carrera si hay llamadas concurrentes.
2. **Índice parcial único en SQLite**:
   ```sql
   CREATE UNIQUE INDEX idx_un_solo_turno_abierto ON turnos_caja(estado) WHERE estado = 'Abierto';
   ```
   - *Ventajas*: Nivel de garantía ACID insuperable en el motor de base de datos. Si se intenta insertar un segundo turno con `estado = 'Abierto'`, SQLite rechaza inmediatamente la transacción arrojando `SQLITE_CONSTRAINT_UNIQUE`.

### Decisión Técnica
Se implementa el **Índice parcial único en SQLite** respaldado por una verificación preventiva en la capa de dominio `TurnoCaja::abrir()`. Esto satisface el Artículo VI de la Constitución (la interfaz nunca es la única responsable de validar reglas críticas).

---

## 2. Vinculación de Pagos a Turnos de Caja (FR-003)

### Contexto
En Feature 002 se implementó la tabla `pagos` para asentar los cobros de cuentas. Para poder liquidar con precisión qué cobros corresponden a qué turno de cajero, se debe establecer la correlación sin romper pagos pasados ni requerir migraciones destructivas.

### Decisión Técnica
- Se agrega de forma aditiva la columna `turno_id INTEGER REFERENCES turnos_caja(id)` a la tabla `pagos`.
- Cuando se ejecuta el comando `registrar_pago`, el backend consulta si hay un turno en estado `Abierto`:
  - Si existe, asocia `turno_id = turno_activo.id`.
  - Si no existe ningún turno abierto y el pago es en `Efectivo`, el sistema advierte o exige la apertura de turno previa (FR-012).
- Para los pagos históricos anteriores a Feature 004, `turno_id` queda como `NULL`, preservando intacta la integridad histórica.

---

## 3. Retiros Parciales de Efectivo (Sangrías de Caja) y Protección de Gaveta (FR-004, FR-005)

### Contexto
Durante las tardes de verano de alta afluencia, la acumulación de efectivo en la gaveta del mostrador representa un riesgo de seguridad física. El cajero o encargado debe poder entregar sobres con dinero al tesorero/caja fuerte sin descuadrar el arqueo.

### Decisión Técnica
- Tabla dedicada `retiros_caja`:
  ```sql
  CREATE TABLE IF NOT EXISTS retiros_caja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      turno_id INTEGER NOT NULL,
      monto REAL NOT NULL CHECK(monto > 0),
      operador TEXT NOT NULL,
      receptor TEXT NOT NULL,
      motivo TEXT NOT NULL,
      creado_en TEXT NOT NULL,
      FOREIGN KEY (turno_id) REFERENCES turnos_caja(id) ON DELETE RESTRICT
  );
  ```
- **Fórmula de control de saldo disponible**:
  $$\text{Efectivo en Gaveta} = \text{Fondo Inicial} + \sum \text{Pagos Efectivo Activos} - \sum \text{Retiros Previos}$$
- Si `monto_solicitado > Efectivo en Gaveta`, el repositorio rechaza la transacción con `DomainError::SaldoInsuficienteEnGaveta`.

---

## 4. Metodología de Arqueo Ciego e Inmutabilidad de Cierre (FR-006, FR-007, FR-009)

### Contexto
Un "arqueo ciego" es una práctica contable estándar donde el operador declara lo que cuenta en dinero físico y cupones de tarjeta sin ver antes la cifra teórica que espera el sistema. Si viera el total teórico de antemano, el operador podría "ajustar" su conteo o forzar números.

### Decisión Técnica
1. **Flujo de Pantalla**: La UI presenta inputs en blanco para que el cajero cargue:
   - Conteo de billetes/efectivo.
   - Total cupones Débito.
   - Total cupones Crédito.
   - Total transferencias comprobadas.
2. **Cálculo de Desvíos en Backend**:
   - `Efectivo Esperado = Fondo Inicial + Cobros Efectivo - Retiros`.
   - `Diferencia = Declarado - Esperado`.
     - `Diferencia == 0`: Caja Exacta.
     - `Diferencia > 0`: Sobrante de Caja (+).
     - `Diferencia < 0`: Faltante de Caja (-).
3. **Umbral de Descargo**: Si $|\text{Diferencia Efectivo}| > \$1.000$, la UI y el backend exigen un campo `justificacion` obligatorio de al menos 4 caracteres.
4. **Cierre Atómico**: Se inserta la fila en `arqueos_cierre` y se actualiza `turnos_caja` a `Cerrado` en una sola transacción SQLite.
5. **Inmutabilidad Absoluta**: Los métodos de `CuentasRepository` y `CatalogoRepository` validan que cualquier operación financiera solo interactúe con turnos abiertos.

---

## 5. Formato de Comprobante de Cierre de Caja para Impresoras Térmicas de 80mm (FR-011)

### Contexto
En los balnearios de la costa argentina, los puntos de venta utilizan impresoras térmicas de 80mm (3 pulgadas / 42 a 48 columnas monospacio) para emitir el comprobante de liquidación de turno que firma el cajero junto al supervisor.

### Decisión Técnica
Se implementa un generador de texto formateado tanto en Rust (backend) como en TypeScript (frontend/simulador), que produce un ticket estructurado:
```text
================================================
          BALNEARIO - CIERRE DE TURNO           
================================================
Turno: TRN-20261027-01       Estado: CERRADO
Cajero: juan_perez           Fecha: 27/10/2026 20:30
Apertura: 27/10/2026 09:00   Fondo Inicial: $25.000,00
------------------------------------------------
RECAUDACIÓN POR MEDIO DE PAGO:
  Efectivo (18 pagos):             $142.500,00
  Tarjeta Débito (12 pagos):        $88.400,00
  Tarjeta Crédito (8 pagos):        $65.000,00
  Transferencia Bancaria (4 pagos): $32.100,00
------------------------------------------------
TOTAL COBRADO EN TURNO:            $328.000,00
------------------------------------------------
MOVIMIENTO DE EFECTIVO EN GAVETA:
  (+) Fondo Inicial:                $25.000,00
  (+) Cobros en Efectivo:          $142.500,00
  (-) Retiros / Sangrías (2):      -$50.000,00
------------------------------------------------
EFECTIVO TEÓRICO ESPERADO:         $117.500,00
EFECTIVO REAL DECLARADO:           $117.000,00
------------------------------------------------
RESULTADO ARQUEO EFECTIVO:            -$500,00 (FALTANTE)
Justificación: Diferencia de cambio en monedas
================================================
Firma Cajero: _________________
Firma Supervisor: ______________
================================================
```

