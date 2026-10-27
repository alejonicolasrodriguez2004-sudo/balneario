# Data Model: Gestión de Cuentas y Pagos

**Feature**: `002-gestion-cuentas-pagos`  
**Date**: 2026-10-27  
**Status**: Completed  

Este documento define el modelo de datos relacional para la consolidación de consumos, la gestión de pagos multimedio y el control de caja en SQLite local.

---

## 1. Diagrama Entidad-Relación

```mermaid
erDiagram
    UBICACIONES_REFERENCIA ||--o{ CUENTAS : "posee"
    CUENTAS ||--|{ CUENTA_COMANDAS : "agrupa"
    COMANDAS ||--o{ CUENTA_COMANDAS : "liquidada_en"
    CUENTAS ||--o{ PAGOS : "recibe"
    CUENTAS ||--o{ AUDITORIA_PAGOS : "audita"

    CUENTAS {
        int id PK "Identificador único correlativo"
        string codigo_visible UK "ej. CTA-20261027-0001"
        string ubicacion_id FK "Vínculo a ubicación"
        string ubicacion_nombre "Snapshot de nombre de ubicación"
        string estado "Abierta | Pagada | Cerrada | Anulada"
        decimal total "Total consolidado de comandas activas"
        decimal saldo_pendiente "total - suma(pagos activos)"
        string creado_por "Operador responsable"
        datetime creado_en "Fecha y hora de apertura"
        datetime cerrado_en "Fecha y hora de liquidación"
        datetime anulado_en "Fecha y hora de anulación"
        string motivo_anulacion "Justificación obligatoria si anulada"
        string anulado_por "Operador que anuló"
    }

    CUENTA_COMANDAS {
        int id PK "Identificador de asociación"
        int cuenta_id FK "Vínculo a la cuenta"
        int comanda_id FK "Comanda consolidada"
        decimal importe_comanda "Importe total de la comanda al consolidar"
    }

    PAGOS {
        int id PK "Identificador único de pago"
        int cuenta_id FK "Vínculo a la cuenta"
        string medio_pago "Efectivo | Tarjeta Débito | Tarjeta Crédito | Transferencia"
        decimal monto "Monto neto imputado a la cuenta"
        decimal monto_entregado "Efectivo recibido del cliente (opcional)"
        decimal vuelto "Cambio entregado al cliente (opcional)"
        string referencia_externa "Nro cupón / comprobante de pago"
        string estado "Activo | Cancelado"
        string motivo_anulacion "Justificación obligatoria si cancelado"
        string cancelado_por "Operador que anuló el cobro"
        datetime cancelado_en "Marca temporal de anulación"
        string creado_por "Cajero de turno"
        datetime creado_en "Fecha y hora del cobro"
        string token_idempotencia UK "Prevención de doble cobro"
    }

    AUDITORIA_PAGOS {
        int id PK "Identificador de auditoría"
        int cuenta_id FK "Cuenta auditada"
        int pago_id FK "Pago involucrado (opcional)"
        string tipo_evento "APERTURA_CUENTA | PAGO_REGISTRADO | PAGO_ANULADO | CIERRE_CUENTA"
        string descripcion "Descripción legible del evento"
        string usuario "Operador responsable"
        datetime timestamp "Marca temporal UTC"
        string metadata_json "Datos detallados de la operación"
    }
```

---

## 2. Máquina de Estados de la Cuenta

```mermaid
stateDiagram-v2
    [*] --> Abierta: Consolidación de comandas de la ubicación
    Abierta --> Abierta: Registro de pagos parciales (saldo > 0)
    Abierta --> Abierta: Anulación de pago (restaura saldo)
    Abierta --> Pagada: Cobro del 100% del saldo (saldo = 0)
    
    Pagada --> Abierta: Anulación de un pago que reabre saldo > 0
    Pagada --> Cerrada: Confirmación de liquidación y liberación de ubicación
    
    Abierta --> Anulada: Anulación administrativa de cuenta (con motivo)
    Pagada --> Anulada: Anulación administrativa de cuenta (con motivo)
    
    Cerrada --> [*]: Estado terminal (cuenta liquidada y ubicación libre)
    Anulada --> [*]: Estado terminal
```

### Reglas de Transición
1. **Apertura**: Al crear la cuenta a partir de comandas activas, el estado inicial es `Abierta` con `saldo_pendiente = total`.
2. **Pago Parcial**: Si `monto_pago < saldo_pendiente`, la cuenta continúa en estado `Abierta` con el saldo actualizado.
3. **Liquidación Completa**: Cuando un pago reduce el saldo a exactamente `0,00`, la cuenta cambia automáticamente a `Pagada`.
4. **Liberación de Ubicación**: Solo una cuenta en estado `Pagada` (saldo = $0,00) puede pasar a `Cerrada` y liberar la ubicación física para nuevos clientes.
5. **Reapertura por Anulación**: Si se anula un pago en una cuenta `Pagada`, el saldo vuelve a ser mayor a $0 y la cuenta regresa automáticamente a estado `Abierta`.

---

## 3. Esquema Físico Relacional SQLite (DDL)

```sql
-- Tabla de Cuentas consolidadas
CREATE TABLE IF NOT EXISTS cuentas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo_visible TEXT NOT NULL UNIQUE,
    ubicacion_id TEXT NOT NULL,
    ubicacion_nombre TEXT NOT NULL,
    estado TEXT NOT NULL CHECK(estado IN ('Abierta', 'Pagada', 'Cerrada', 'Anulada')),
    total REAL NOT NULL DEFAULT 0.0 CHECK(total >= 0),
    saldo_pendiente REAL NOT NULL DEFAULT 0.0 CHECK(saldo_pendiente >= 0),
    creado_por TEXT NOT NULL,
    creado_en TEXT NOT NULL,       -- ISO-8601 UTC
    cerrado_en TEXT,               -- ISO-8601 UTC
    anulado_en TEXT,               -- ISO-8601 UTC
    motivo_anulacion TEXT,
    anulado_por TEXT,
    FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones_referencia(id) ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cuentas_estado ON cuentas(estado);
CREATE INDEX IF NOT EXISTS idx_cuentas_ubicacion ON cuentas(ubicacion_id);

-- Tabla asociativa Cuenta - Comandas
CREATE TABLE IF NOT EXISTS cuenta_comandas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuenta_id INTEGER NOT NULL,
    comanda_id INTEGER NOT NULL,
    importe_comanda REAL NOT NULL CHECK(importe_comanda >= 0),
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE CASCADE,
    FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE RESTRICT,
    UNIQUE(cuenta_id, comanda_id)
);

CREATE INDEX IF NOT EXISTS idx_cuenta_comandas_cuenta ON cuenta_comandas(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_cuenta_comandas_comanda ON cuenta_comandas(comanda_id);

-- Tabla de Pagos individuales
CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuenta_id INTEGER NOT NULL,
    medio_pago TEXT NOT NULL CHECK(medio_pago IN ('Efectivo', 'Tarjeta Débito', 'Tarjeta Crédito', 'Transferencia')),
    monto REAL NOT NULL CHECK(monto > 0),
    monto_entregado REAL CHECK(monto_entregado >= monto),
    vuelto REAL CHECK(vuelto >= 0),
    referencia_externa TEXT,
    estado TEXT NOT NULL CHECK(estado IN ('Activo', 'Cancelado')) DEFAULT 'Activo',
    motivo_anulacion TEXT,
    cancelado_por TEXT,
    cancelado_en TEXT,
    creado_por TEXT NOT NULL,
    creado_en TEXT NOT NULL,
    token_idempotencia TEXT UNIQUE,
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_pagos_cuenta ON pagos(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_creado_en ON pagos(creado_en);

-- Tabla de Auditoría de Pagos y Caja
CREATE TABLE IF NOT EXISTS auditoria_pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cuenta_id INTEGER NOT NULL,
    pago_id INTEGER,
    tipo_evento TEXT NOT NULL CHECK(tipo_evento IN (
        'APERTURA_CUENTA', 
        'PAGO_REGISTRADO', 
        'PAGO_ANULADO', 
        'CIERRE_CUENTA'
    )),
    descripcion TEXT NOT NULL,
    usuario TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    metadata_json TEXT,
    FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
    FOREIGN KEY (pago_id) REFERENCES pagos(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_auditoria_pagos_cuenta ON auditoria_pagos(cuenta_id);
```

