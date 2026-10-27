# Interface Contracts: Gestión de Cuentas y Pagos

**Feature**: `002-gestion-cuentas-pagos`  
**Date**: 2026-10-27  
**Status**: Completed  
**Protocol**: Tauri 2.x IPC (`invoke<T>(command_name, payload)`)

Este documento formaliza los contratos de interfaz entre la interfaz visual (React/TypeScript) y el módulo de cuentas y cobranzas en Rust a través de comandos IPC.

---

## 1. Definición de Tipos y DTOs (TypeScript)

```typescript
export type EstadoCuenta = 'Abierta' | 'Pagada' | 'Cerrada' | 'Anulada';
export type MedioPago = 'Efectivo' | 'Tarjeta Débito' | 'Tarjeta Crédito' | 'Transferencia';
export type EstadoPago = 'Activo' | 'Cancelado';
```

> **Nota de Serialización**: En Rust (`domain/pagos.rs`), el enum `MedioPago` utilizará atributos `#[serde(rename = "...")]` para serializarse de forma idéntica a los literales de TypeScript:
> - `MedioPago::Efectivo` ↔ `"Efectivo"`
> - `MedioPago::TarjetaDebito` ↔ `"Tarjeta Débito"`
> - `MedioPago::TarjetaCredito` ↔ `"Tarjeta Crédito"`
> - `MedioPago::Transferencia` ↔ `"Transferencia"`

```typescript

export interface PagoDto {
  id: number;
  cuenta_id: number;
  medio_pago: MedioPago;
  monto: number;
  monto_entregado?: number | null;
  vuelto?: number | null;
  referencia_externa?: string | null;
  estado: EstadoPago;
  motivo_anulacion?: string | null;
  cancelado_por?: string | null;
  cancelado_en?: string | null;
  creado_por: string;
  creado_en: string;
}

export interface ComandaEnCuentaDto {
  comanda_id: number;
  codigo_visible: string;
  total: number;
}

export interface CuentaDto {
  id: number;
  codigo_visible: string;
  ubicacion_id: string;
  ubicacion_nombre: string;
  estado: EstadoCuenta;
  total: number;
  saldo_pendiente: number;
  creado_por: string;
  creado_en: string;
  cerrado_en?: string | null;
  anulado_en?: string | null;
  motivo_anulacion?: string | null;
  anulado_por?: string | null;
}

export interface CuentaDetalladaDto extends CuentaDto {
  comandas_asociadas: ComandaEnCuentaDto[];
  pagos: PagoDto[];
}

export interface ResumenArqueoDto {
  total_efectivo: number;
  total_debito: number;
  total_credito: number;
  total_transferencia: number;
  total_recaudado: number;
  cantidad_pagos_activos: number;
  cantidad_pagos_anulados: number;
}

export interface ErrorDto {
  codigo: string;
  mensaje: string;
  detalles?: string;
}

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ErrorDto };
```

---

## 2. Comandos Tauri Expuestos

### 2.1. `abrir_cuenta`
Consolida las comandas activas de una ubicación física y abre una nueva cuenta de liquidación.

- **Nombre del comando**: `abrir_cuenta`
- **Payload de entrada**:
  ```json
  {
    "ubicacion_id": "carpa-12",
    "operador": "cajero_turno_tarde"
  }
  ```
- **Respuesta de éxito**: `ApiResponse<CuentaDetalladaDto>`
- **Errores posibles**:
  - `UBICACION_NO_ENCONTRADA`: La ubicación física no existe.
  - `SIN_CONSUMOS_PENDIENTES`: No hay comandas abiertas o activas para consolidar.
  - `CUENTA_YA_ABIERTA`: Ya existe una cuenta abierta pendiente para esa ubicación.

---

### 2.2. `registrar_pago`
Registra un cobro contra una cuenta abierta deduciendo el saldo pendiente.

- **Nombre del comando**: `registrar_pago`
- **Payload de entrada**:
  ```json
  {
    "cuenta_id": 1,
    "medio_pago": "Efectivo",
    "monto": 5000.00,
    "monto_entregado": 10000.00,
    "referencia_externa": null,
    "operador": "cajero_turno_tarde",
    "token_idempotencia": "pago-uuid-456"
  }
  ```
- **Respuesta de éxito**:
  ```json
  {
    "success": true,
    "data": {
      "cuenta_actualizada": { "id": 1, "estado": "Abierta", "saldo_pendiente": 3500.00 },
      "pago_registrado": { "id": 201, "monto": 5000.00, "vuelto": 5000.00 },
      "vuelto_a_entregar": 5000.00
    }
  }
  ```
- **Errores posibles**:
  - `CUENTA_NO_ENCONTRADA`: ID de cuenta inexistente.
  - `MONTO_INVALIDO`: El monto es menor o igual a cero.
  - `MONTO_EXCEDE_SALDO`: El monto imputado supera el saldo pendiente de la cuenta.
  - `CUENTA_YA_PAGADA`: La cuenta ya no tiene saldo pendiente.
  - `SOLICITUD_DUPLICADA`: El `token_idempotencia` ya fue utilizado.

---

### 2.3. `anular_pago`
Efectúa la baja lógica (*soft-cancel*) de un pago registrado erróneamente, restaurando el saldo de la cuenta.

- **Nombre del comando**: `anular_pago`
- **Payload de entrada**:
  ```json
  {
    "cuenta_id": 1,
    "pago_id": 201,
    "motivo": "Error de tipeo del cajero: correspondía transferencia",
    "operador": "encargado_caja"
  }
  ```
- **Respuesta de éxito**: `ApiResponse<CuentaDetalladaDto>` con el pago en estado `Cancelado` y el saldo restaurado.
- **Errores posibles**:
  - `MOTIVO_REQUERIDO`: Motivo con menos de 4 caracteres.
  - `PAGO_NO_ENCONTRADO`: Pago inexistente o no perteneciente a la cuenta.
  - `PAGO_YA_CANCELADO`: El pago ya fue cancelado previamente.

---

### 2.4. `cerrar_cuenta_y_liberar`
Finaliza la cuenta y libera la ubicación física. Requiere terminantemente que el saldo pendiente sea $0,00.

- **Nombre del comando**: `cerrar_cuenta_y_liberar`
- **Payload de entrada**:
  ```json
  {
    "cuenta_id": 1,
    "operador": "encargado_caja"
  }
  ```
- **Respuesta de éxito**: `ApiResponse<CuentaDto>` con `estado: "Cerrada"` y fecha de cierre.
- **Errores posibles**:
  - `SALDO_PENDIENTE`: La cuenta tiene saldo mayor a cero ($ > 0,00$) y no puede cerrarse ni liberar la ubicación.

---

### 2.5. `obtener_cuenta`
Obtiene la cuenta detallada con sus comandas y pagos.

- **Nombre del comando**: `obtener_cuenta`
- **Payload**: `{ "cuenta_id": 1 }`
- **Respuesta de éxito**: `ApiResponse<CuentaDetalladaDto>`

---

### 2.6. `obtener_resumen_arqueo`
Genera el arqueo consolidado del turno por medio de pago.

- **Nombre del comando**: `obtener_resumen_arqueo`
- **Payload**: `{}`
- **Respuesta de éxito**: `ApiResponse<ResumenArqueoDto>`

---

### 2.7. `anular_cuenta`
Efectúa la baja lógica (*soft-cancel*) de una cuenta abierta por equivocación exigiendo motivo justificado (mínimo 4 caracteres).

- **Nombre del comando**: `anular_cuenta`
- **Payload de entrada**:
  ```json
  {
    "cuenta_id": 1,
    "motivo": "Apertura errónea en mesa equivocada",
    "operador": "encargado_caja"
  }
  ```
- **Respuesta de éxito**: `ApiResponse<CuentaDto>` con `estado: "Anulada"`.
- **Errores posibles**:
  - `MOTIVO_REQUERIDO`: Motivo con menos de 4 caracteres.
  - `CUENTA_TIENE_PAGOS_ACTIVOS`: No se puede anular una cuenta con cobros activos; deben anularse los pagos primero.
  - `CUENTA_YA_CERRADA`: La cuenta ya fue cerrada previamente.


