# Interface Contracts: Tauri IPC Commands

**Feature**: `001-gestion-comandas`  
**Date**: 2026-10-26  
**Status**: Completed  
**Protocol**: Tauri 2.x IPC (`invoke<T>(command_name, payload)`)

Este documento formaliza los contratos de interfaz entre la interfaz visual (React/TypeScript) y el núcleo de dominio en Rust a través de comandos IPC de Tauri.

---

## 1. Definición de Tipos y DTOs (TypeScript)

```typescript
export type EstadoComanda = 'Borrador' | 'Abierta' | 'Cerrada' | 'Anulada';
export type EstadoItem = 'Activo' | 'Cancelado';
export type TipoUbicacion = 'Carpa' | 'Sombrilla' | 'Mesa' | 'Reposera' | 'Mostrador';

export interface UbicacionDto {
  id: string;
  tipo: TipoUbicacion;
  numero: number;
  nombre: string;
  activo: boolean;
}

export interface ProductoDto {
  id: string;
  nombre: string;
  categoria: string;
  precio_actual: number;
  activo: boolean;
}

export interface ItemComandaInput {
  producto_id: string;
  cantidad: number;          // Entero > 0
  observaciones?: string;    // Opcional, máx 255 caracteres
}

export interface ItemComandaDto {
  id: number;
  comanda_id: number;
  producto_id: string;
  nombre_producto: string;   // Congelado
  cantidad: number;
  precio_unitario: number;   // Congelado
  subtotal: number;
  observaciones?: string;
  estado: EstadoItem;
  motivo_cancelacion?: string;
  cancelado_en?: string;
  creado_en: string;         // ISO-8601 UTC
}

export interface ComandaResumenDto {
  id: number;
  codigo_visible: string;
  ubicacion_id: string;
  ubicacion_nombre: string;
  estado: EstadoComanda;
  total: number;
  cantidad_items: number;
  creado_por: string;
  creado_en: string;
}

export interface ComandaDetalladaDto {
  id: number;
  codigo_visible: string;
  ubicacion_id: string;
  ubicacion_nombre: string;
  estado: EstadoComanda;
  total: number;
  creado_por: string;
  creado_en: string;
  cerrado_en?: string;
  anulado_en?: string;
  motivo_anulacion?: string;
  anulado_por?: string;
  items: ItemComandaDto[];
}

export interface ErrorDto {
  codigo: string;            // Código canónico de error (ej. "CANTIDAD_INVALIDA")
  mensaje: string;           // Mensaje descriptivo para el usuario
  detalles?: string;         // Información técnica complementaria
}

export type ApiResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: ErrorDto };
```

---

## 2. Comandos Tauri Expuestos

### 2.1. `crear_comanda`
Crea y persiste atómicamente una nueva comanda en estado `Abierta`.

- **Nombre del comando**: `crear_comanda`
- **Payload de entrada**:
  ```json
  {
    "ubicacion_id": "carpa-12",
    "items": [
      { "producto_id": "licuado-frutilla", "cantidad": 2, "observaciones": "sin azúcar" },
      { "producto_id": "tostado-mixto", "cantidad": 1 }
    ],
    "operador": "cajero_turno_manana",
    "token_idempotencia": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6"
  }
  ```
- **Respuesta de éxito (`ApiResponse<ComandaDetalladaDto>`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "codigo_visible": "CMD-0001",
      "ubicacion_id": "carpa-12",
      "ubicacion_nombre": "Carpa 12",
      "estado": "Abierta",
      "total": 8500.00,
      "creado_por": "cajero_turno_manana",
      "creado_en": "2026-10-26T21:40:00Z",
      "items": [
        {
          "id": 101,
          "comanda_id": 1,
          "producto_id": "licuado-frutilla",
          "nombre_producto": "Licuado de Frutilla",
          "cantidad": 2,
          "precio_unitario": 2500.00,
          "subtotal": 5000.00,
          "observaciones": "sin azúcar",
          "estado": "Activo",
          "creado_en": "2026-10-26T21:40:00Z"
        },
        {
          "id": 102,
          "comanda_id": 1,
          "producto_id": "tostado-mixto",
          "nombre_producto": "Tostado Mixto",
          "cantidad": 1,
          "precio_unitario": 3500.00,
          "subtotal": 3500.00,
          "observaciones": null,
          "estado": "Activo",
          "creado_en": "2026-10-26T21:40:00Z"
        }
      ]
    }
  }
  ```
- **Errores posibles**:
  - `UBICACION_NO_ENCONTRADA`: La ubicación física indicada no existe o está inactiva.
  - `COMANDA_VACIA`: La solicitud no contiene ningún producto.
  - `CANTIDAD_INVALIDA`: Uno de los productos tiene cantidad menor o igual a cero.
  - `PRODUCTO_NO_ENCONTRADO`: Uno de los productos solicitados no existe en el catálogo.
  - `SOLICITUD_DUPLICADA`: El `token_idempotencia` ya fue procesado.

---

### 2.2. `agregar_items_comanda`
Incorpora nuevos ítems a una comanda existente en estado `Abierta`.

- **Nombre del comando**: `agregar_items_comanda`
- **Payload de entrada**:
  ```json
  {
    "comanda_id": 1,
    "items": [
      { "producto_id": "cafe-cortado", "cantidad": 2 }
    ],
    "operador": "cajero_turno_manana"
  }
  ```
- **Respuesta de éxito**: `ApiResponse<ComandaDetalladaDto>` con los ítems anexados y el nuevo total recalculado.
- **Errores posibles**:
  - `COMANDA_NO_ENCONTRADA`: No existe comanda con dicho ID.
  - `COMANDA_ESTADO_INVALIDO`: La comanda se encuentra en estado `Cerrada` o `Anulada`.
  - `CANTIDAD_INVALIDA`: Cantidad no permitida.

---

### 2.3. `anular_comanda`
Efectúa la baja lógica (*soft-cancel*) de una comanda `Abierta` exigiendo justificación.

- **Nombre del comando**: `anular_comanda`
- **Payload de entrada**:
  ```json
  {
    "comanda_id": 1,
    "motivo": "Cliente se retira por tormenta repentina",
    "operador": "encargado_playa"
  }
  ```
- **Respuesta de éxito**: `ApiResponse<ComandaDetalladaDto>` con `estado: "Anulada"`, `motivo_anulacion`, `anulado_en` y `anulado_por`.
- **Errores posibles**:
  - `MOTIVO_REQUERIDO`: El motivo está vacío o tiene menos de 4 caracteres.
  - `COMANDA_NO_ENCONTRADA`: No existe comanda con dicho ID.
  - `COMANDA_YA_FINALIZADA`: La comanda ya está `Cerrada` o previamente `Anulada`.

---

### 2.4. `cancelar_item_comanda`
Cancela de forma lógica un ítem específico dentro de una comanda abierta.

- **Nombre del comando**: `cancelar_item_comanda`
- **Payload de entrada**:
  ```json
  {
    "comanda_id": 1,
    "item_id": 102,
    "motivo": "Error de tipeo del mozo al marcar tostado",
    "operador": "cajero_turno_manana"
  }
  ```
- **Respuesta de éxito**: `ApiResponse<ComandaDetalladaDto>` con el ítem marcado como `estado: "Cancelado"` y el total de la comanda recalculado restando dicho ítem.
- **Errores posibles**:
  - `MOTIVO_REQUERIDO`: Falta justificación de cancelación.
  - `ITEM_NO_ENCONTRADO`: El ítem no pertenece a la comanda o no existe.
  - `ITEM_YA_CANCELADO`: El ítem ya había sido cancelado con anterioridad.

---

### 2.5. `obtener_comanda`
Obtiene la composición detallada de una comanda.

- **Nombre del comando**: `obtener_comanda`
- **Payload de entrada**: `{ "comanda_id": 1 }`
- **Respuesta de éxito**: `ApiResponse<ComandaDetalladaDto>`.

---

### 2.6. `listar_comandas`
Lista comandas con opciones de filtrado.

- **Nombre del comando**: `listar_comandas`
- **Payload de entrada**:
  ```json
  {
    "filtro_estado": "Abierta",
    "filtro_ubicacion_id": "carpa-12"
  }
  ```
- **Respuesta de éxito**: `ApiResponse<ComandaResumenDto[]>`.

---

### 2.7. `obtener_catalogos_referencia`
Provee las ubicaciones y productos disponibles para alimentar la UI.

- **Nombre del comando**: `obtener_catalogos_referencia`
- **Payload de entrada**: `{}`
- **Respuesta de éxito**: `ApiResponse<{ ubicaciones: UbicacionDto[], productos: ProductoDto[] }>`.

