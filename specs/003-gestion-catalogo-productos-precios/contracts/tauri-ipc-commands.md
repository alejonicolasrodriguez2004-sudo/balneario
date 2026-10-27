# Interface Contracts: Gestión de Catálogo de Productos y Precios

**Feature**: `003-gestion-catalogo-productos-precios`  
**Date**: 2026-10-27  
**Protocol**: Tauri 2.x IPC (`invoke<T>(command_name, payload)`)

---

## 1. Definición de Tipos y DTOs (TypeScript)

```typescript
export interface CategoriaDto {
  id: string;
  nombre: string;
  icono?: string | null;
  orden: number;
  activo: boolean;
}

export interface ProductoDto {
  id: string;
  nombre: string;
  categoria: string;
  precio_actual: number;
  disponible_para_venta: boolean;
  descripcion?: string | null;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface HistorialPrecioDto {
  id: number;
  producto_id: string;
  precio_anterior: number;
  precio_nuevo: number;
  fecha_cambio: string;
  usuario: string;
  motivo?: string | null;
}

export interface CatalogoCompletoDto {
  categorias: CategoriaDto[];
  productos: ProductoDto[];
}

export interface CrearProductoRequest {
  id?: string | null; // Si se omite, se autogenera slug
  nombre: string;
  categoria: string;
  precio_actual: number;
  descripcion?: string | null;
  operador: string;
}

export interface ActualizarProductoRequest {
  id: string;
  nombre: string;
  categoria: string;
  descripcion?: string | null;
  operador: string;
}

export interface ActualizarPrecioRequest {
  producto_id: string;
  nuevo_precio: number;
  motivo?: string | null;
  operador: string;
}

export interface CambiarDisponibilidadRequest {
  producto_id: string;
  disponible: boolean;
}

export interface DarBajaProductoRequest {
  producto_id: string;
  operador: string;
}
```

---

## 2. Comandos Tauri Expuestos

### 2.1. `listar_catalogo_completo`
Retorna todas las categorías y productos para la administración y comandería.

- **Nombre**: `listar_catalogo_completo`
- **Payload**: `{ "incluir_inactivos": false }`
- **Respuesta**: `ApiResponse<CatalogoCompletoDto>`

---

### 2.2. `crear_producto`
Da de alta un nuevo producto comercial en la base de datos local.

- **Nombre**: `crear_producto`
- **Payload**:
  ```json
  {
    "nombre": "Tostado Especial Crudo y Queso",
    "categoria": "Minutas",
    "precio_actual": 4800.0,
    "descripcion": "Pan árabe tostado con jamón crudo y queso de campo",
    "operador": "admin_playa"
  }
  ```
- **Respuesta**: `ApiResponse<ProductoDto>`
- **Errores**:
  - `NOMBRE_REQUERIDO`: Nombre vacío.
  - `PRECIO_INVALIDO`: Precio $\le 0$.
  - `PRODUCTO_YA_EXISTE`: Ya existe un producto con ese identificador.

---

### 2.3. `actualizar_precio_producto`
Actualiza el precio de venta vigente y registra la auditoría en `historial_precios` sin alterar transacciones históricas.

- **Nombre**: `actualizar_precio_producto`
- **Payload**:
  ```json
  {
    "producto_id": "licuado-frutilla",
    "nuevo_precio": 3000.0,
    "motivo": "Ajuste quincenal de insumos",
    "operador": "admin_playa"
  }
  ```
- **Respuesta**: `ApiResponse<ProductoDto>`
- **Errores**:
  - `PRODUCTO_NO_ENCONTRADO`: ID inexistente.
  - `PRECIO_INVALIDO`: Precio $\le 0$.

---

### 2.4. `cambiar_disponibilidad_producto`
Pausa o reanuda de inmediato la venta de un producto (control de falta de stock en 1 toque).

- **Nombre**: `cambiar_disponibilidad_producto`
- **Payload**:
  ```json
  {
    "producto_id": "licuado-frutilla",
    "disponible": false
  }
  ```
- **Respuesta**: `ApiResponse<ProductoDto>`

---

### 2.5. `dar_baja_producto`
Aplica baja lógica (`activo = 0`) para descontinuar un producto de la carta comercial.

- **Nombre**: `dar_baja_producto`
- **Payload**:
  ```json
  {
    "producto_id": "plato-antiguo",
    "operador": "admin_playa"
  }
  ```
- **Respuesta**: `ApiResponse<ProductoDto>`

---

### 2.6. `obtener_historial_precios`
Obtiene las variaciones históricas de precio de un producto para trazabilidad contable.

- **Nombre**: `obtener_historial_precios`
- **Payload**: `{ "producto_id": "licuado-frutilla" }`
- **Respuesta**: `ApiResponse<Vec<HistorialPrecioDto>>`

