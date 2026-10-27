# Interface Contracts: Gestión de Turnos de Caja y Arqueo Ciego

**Feature**: `004-gestion-turnos-arqueo-caja`  
**Date**: 2026-10-27  
**Protocol**: Tauri 2.x IPC (`invoke<T>(command_name, payload)`)

---

## 1. Definición de Tipos y DTOs (TypeScript)

```typescript
export type EstadoTurno = 'Abierto' | 'Cerrado';

export interface TurnoCajaDto {
  id: number;
  codigo_visible: string;
  operador_apertura: string;
  fondo_inicial: number;
  fecha_apertura: string;
  estado: EstadoTurno;
  operador_cierre?: string | null;
  fecha_cierre?: string | null;
  observaciones_cierre?: string | null;
}

export interface RetiroCajaDto {
  id: number;
  turno_id: number;
  monto: number;
  operador: string;
  receptor: string;
  motivo: string;
  creado_en: string;
}

export interface ArqueoCierreDto {
  id: number;
  turno_id: number;
  esperado_efectivo: number;
  declarado_efectivo: number;
  diferencia_efectivo: number;
  esperado_debito: number;
  declarado_debito: number;
  diferencia_debito: number;
  esperado_credito: number;
  declarado_credito: number;
  diferencia_credito: number;
  esperado_transferencia: number;
  declarado_transferencia: number;
  diferencia_transferencia: number;
  diferencia_total: number;
  justificacion?: string | null;
  creado_en: string;
}

export interface EstadoTurnoActualDto {
  turno_abierto: TurnoCajaDto | null;
  efectivo_en_gaveta: number;
  total_cobrado_efectivo: number;
  total_cobrado_debito: number;
  total_cobrado_credito: number;
  total_cobrado_transferencia: number;
  total_recaudado: number;
  total_retiros: number;
  cantidad_cobros: number;
  cantidad_retiros: number;
  cuentas_abiertas_pendientes: number;
}

export interface DetalleTurnoCompletoDto {
  turno: TurnoCajaDto;
  arqueo?: ArqueoCierreDto | null;
  retiros: RetiroCajaDto[];
  resumen_medios_pago: {
    efectivo: number;
    debito: number;
    credito: number;
    transferencia: number;
    total: number;
  };
}

// Request Payloads
export interface AbrirTurnoPayload {
  operador: string;
  fondo_inicial: number;
}

export interface RegistrarRetiroPayload {
  monto: number;
  operador: string;
  receptor: string;
  motivo: string;
}

export interface CerrarTurnoArqueoCiegoPayload {
  declarado_efectivo: number;
  declarado_debito?: number;
  declarado_credito?: number;
  declarado_transferencia?: number;
  justificacion?: string | null;
  operador: string;
}

export interface ListarTurnosPayload {
  filtro_estado?: EstadoTurno | 'Todos';
  limite?: number;
}
```

---

## 2. Comandos Tauri IPC Expuestos

### 2.1. `obtener_estado_turno_actual`
Consulta si hay un turno abierto actualmente en la terminal y su saldo en gaveta.
- **Invocación**: `invoke('obtener_estado_turno_actual')`
- **Respuesta**: `ApiResponse<EstadoTurnoActualDto>`

---

### 2.2. `abrir_turno_caja`
Abre un nuevo turno de caja con fondo inicial en efectivo.
- **Invocación**: `invoke('abrir_turno_caja', { payload: { operador: "cajero_1", fondo_inicial: 25000.0 } })`
- **Respuesta**: `ApiResponse<TurnoCajaDto>`
- **Errores**:
  - `TURNO_YA_ABIERTO`: Ya existe un turno activo en la terminal.
  - `FONDO_INVALIDO`: El fondo inicial no puede ser negativo.

---

### 2.3. `registrar_retiro_caja`
Registra una sangría parcial de efectivo desde la gaveta hacia caja fuerte.
- **Invocación**: `invoke('registrar_retiro_caja', { payload: { monto: 50000.0, operador: "cajero_1", receptor: "tesorero_luis", motivo: "Traslado seguro por límite de gaveta" } })`
- **Respuesta**: `ApiResponse<RetiroCajaDto>`
- **Errores**:
  - `NO_HAY_TURNO_ABIERTO`: Requiere un turno activo.
  - `SALDO_INSUFICIENTE_EN_GAVETA`: El monto excede el efectivo disponible en caja.

---

### 2.4. `cerrar_turno_arqueo_ciego`
Ejecuta el arqueo ciego, calcula las diferencias y sella el turno de forma inmutable.
- **Invocación**:
  ```json
  {
    "declarado_efectivo": 117000.0,
    "declarado_debito": 88400.0,
    "declarado_credito": 65000.0,
    "declarado_transferencia": 32100.0,
    "justificacion": "Diferencia de $500 por redondeo de monedas",
    "operador": "cajero_1"
  }
  ```
- **Respuesta**: `ApiResponse<DetalleTurnoCompletoDto>`
- **Errores**:
  - `JUSTIFICACION_REQUERIDA`: Desvío superior a $1.000 sin descargo obligatorio.
  - `NO_HAY_TURNO_ABIERTO`: No hay turno activo para cerrar.

---

### 2.5. `listar_historial_turnos`
Retorna la lista histórica de turnos cerrados y abiertos para auditoría administrativa.
- **Invocación**: `invoke('listar_historial_turnos', { payload: { filtro_estado: "Todos" } })`
- **Respuesta**: `ApiResponse<TurnoCajaDto[]>`

---

### 2.6. `obtener_detalle_turno`
Obtiene la liquidación completa de un turno (arqueo, pagos asociados, retiros).
- **Invocación**: `invoke('obtener_detalle_turno', { payload: { turno_id: 1 } })`
- **Respuesta**: `ApiResponse<DetalleTurnoCompletoDto>`

---

### 2.7. `generar_comprobante_impresion_turno`
Genera el texto formateado monospaciado para el ticket de liquidación de 80mm.
- **Invocación**: `invoke('generar_comprobante_impresion_turno', { payload: { turno_id: 1 } })`
- **Respuesta**: `ApiResponse<string>`

