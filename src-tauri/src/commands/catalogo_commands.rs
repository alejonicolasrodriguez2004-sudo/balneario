// src-tauri/src/commands/catalogo_commands.rs
// Controladores IPC para operaciones de Catálogo de Productos y Precios (Feature 003)

use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;

use super::comanda_commands::{ApiResponse, AppState};
use crate::domain::catalogo::{CatalogoCompleto, CategoriaReferencia, HistorialPrecio, ProductoReferencia};
use crate::storage::catalogo_repo::CatalogoRepository;

#[derive(Debug, Deserialize)]
pub struct ListarCatalogoPayload {
    pub incluir_inactivos: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CrearProductoPayload {
    pub id: Option<String>,
    pub nombre: String,
    pub categoria: String,
    pub precio_actual: f64,
    pub descripcion: Option<String>,
    pub operador: String,
}

#[derive(Debug, Deserialize)]
pub struct ActualizarProductoPayload {
    pub id: String,
    pub nombre: String,
    pub categoria: String,
    pub descripcion: Option<String>,
    pub operador: String,
}

#[derive(Debug, Deserialize)]
pub struct ActualizarPrecioPayload {
    pub producto_id: String,
    pub nuevo_precio: f64,
    pub motivo: Option<String>,
    pub operador: String,
}

#[derive(Debug, Deserialize)]
pub struct CambiarDisponibilidadPayload {
    pub producto_id: String,
    pub disponible: bool,
}

#[derive(Debug, Deserialize)]
pub struct DarBajaProductoPayload {
    pub producto_id: String,
    pub operador: String,
}

#[derive(Debug, Deserialize)]
pub struct ObtenerHistorialPayload {
    pub producto_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ListarCategoriasPayload {
    pub solo_activas: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct GuardarCategoriaPayload {
    pub id: Option<String>,
    pub nombre: String,
    pub icono: Option<String>,
    pub orden: Option<i64>,
    pub activo: Option<bool>,
}

#[tauri::command]
pub fn listar_catalogo_completo(
    state: State<AppState>,
    payload: Option<ListarCatalogoPayload>,
) -> ApiResponse<CatalogoCompleto> {
    let db = match state.db.lock() {
        Ok(guard) => guard,
        Err(_) => return ApiResponse::Err {
            error: crate::domain::errors::ErrorDto {
                codigo: "CONCURRENCY_ERROR".to_string(),
                mensaje: "Error de bloqueo interno de base de datos".to_string(),
            },
        },
    };

    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::from(Err(e)),
    };

    let incluir_inactivos = payload.and_then(|p| p.incluir_inactivos).unwrap_or(false);
    let mut repo = CatalogoRepository::new(&mut conn);
    ApiResponse::from(repo.listar_catalogo_completo(incluir_inactivos))
}

#[tauri::command]
pub fn crear_producto(
    state: State<AppState>,
    payload: CrearProductoPayload,
) -> ApiResponse<ProductoReferencia> {
    let db = match state.db.lock() {
        Ok(guard) => guard,
        Err(_) => return ApiResponse::Err {
            error: crate::domain::errors::ErrorDto {
                codigo: "CONCURRENCY_ERROR".to_string(),
                mensaje: "Error de bloqueo interno de base de datos".to_string(),
            },
        },
    };

    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::from(Err(e)),
    };

    let timestamp = Utc::now().to_rfc3339();
    let producto_result = ProductoReferencia::nuevo(
        payload.id.unwrap_or_default(),
        payload.nombre,
        payload.categoria,
        payload.precio_actual,
        payload.descripcion,
        timestamp,
    );

    let producto = match producto_result {
        Ok(p) => p,
        Err(e) => return ApiResponse::from(Err(e)),
    };

    let mut repo = CatalogoRepository::new(&mut conn);
    ApiResponse::from(repo.crear_producto(&producto, &payload.operador))
}

#[tauri::command]
pub fn actualizar_producto(
    state: State<AppState>,
    payload: ActualizarProductoPayload,
) -> ApiResponse<ProductoReferencia> {
    let db = match state.db.lock() {
        Ok(guard) => guard,
        Err(_) => return ApiResponse::Err {
            error: crate::domain::errors::ErrorDto {
                codigo: "CONCURRENCY_ERROR".to_string(),
                mensaje: "Error de bloqueo interno de base de datos".to_string(),
            },
        },
    };

    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::from(Err(e)),
    };

    let timestamp = Utc::now().to_rfc3339();
    let mut repo = CatalogoRepository::new(&mut conn);
    ApiResponse::from(repo.actualizar_producto(
        &payload.id,
        &payload.nombre,
        &payload.categoria,
        payload.descripcion,
        &timestamp,
    ))
}

#[tauri::command]
pub fn actualizar_precio_producto(
    state: State<AppState>,
    payload: ActualizarPrecioPayload,
) -> ApiResponse<ProductoReferencia> {
    let db = match state.db.lock() {
        Ok(guard) => guard,
        Err(_) => return ApiResponse::Err {
            error: crate::domain::errors::ErrorDto {
                codigo: "CONCURRENCY_ERROR".to_string(),
                mensaje: "Error de bloqueo interno de base de datos".to_string(),
            },
        },
    };

    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::from(Err(e)),
    };

    let timestamp = Utc::now().to_rfc3339();
    let mut repo = CatalogoRepository::new(&mut conn);
    ApiResponse::from(repo.actualizar_precio_producto(
        &payload.producto_id,
        payload.nuevo_precio,
        &payload.operador,
        payload.motivo.as_deref(),
        &timestamp,
    ))
}

#[tauri::command]
pub fn cambiar_disponibilidad_producto(
    state: State<AppState>,
    payload: CambiarDisponibilidadPayload,
) -> ApiResponse<ProductoReferencia> {
    let db = match state.db.lock() {
        Ok(guard) => guard,
        Err(_) => return ApiResponse::Err {
            error: crate::domain::errors::ErrorDto {
                codigo: "CONCURRENCY_ERROR".to_string(),
                mensaje: "Error de bloqueo interno de base de datos".to_string(),
            },
        },
    };

    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::from(Err(e)),
    };

    let timestamp = Utc::now().to_rfc3339();
    let mut repo = CatalogoRepository::new(&mut conn);
    ApiResponse::from(repo.cambiar_disponibilidad_producto(
        &payload.producto_id,
        payload.disponible,
        &timestamp,
    ))
}

#[tauri::command]
pub fn dar_baja_producto(
    state: State<AppState>,
    payload: DarBajaProductoPayload,
) -> ApiResponse<ProductoReferencia> {
    let db = match state.db.lock() {
        Ok(guard) => guard,
        Err(_) => return ApiResponse::Err {
            error: crate::domain::errors::ErrorDto {
                codigo: "CONCURRENCY_ERROR".to_string(),
                mensaje: "Error de bloqueo interno de base de datos".to_string(),
            },
        },
    };

    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::from(Err(e)),
    };

    let timestamp = Utc::now().to_rfc3339();
    let mut repo = CatalogoRepository::new(&mut conn);
    ApiResponse::from(repo.dar_baja_producto(&payload.producto_id, &timestamp))
}

#[tauri::command]
pub fn obtener_historial_precios(
    state: State<AppState>,
    payload: ObtenerHistorialPayload,
) -> ApiResponse<Vec<HistorialPrecio>> {
    let db = match state.db.lock() {
        Ok(guard) => guard,
        Err(_) => return ApiResponse::Err {
            error: crate::domain::errors::ErrorDto {
                codigo: "CONCURRENCY_ERROR".to_string(),
                mensaje: "Error de bloqueo interno de base de datos".to_string(),
            },
        },
    };

    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::from(Err(e)),
    };

    let mut repo = CatalogoRepository::new(&mut conn);
    ApiResponse::from(repo.obtener_historial_precios(&payload.producto_id))
}

#[tauri::command]
pub fn listar_categorias(
    state: State<AppState>,
    payload: Option<ListarCategoriasPayload>,
) -> ApiResponse<Vec<CategoriaReferencia>> {
    let db = match state.db.lock() {
        Ok(guard) => guard,
        Err(_) => return ApiResponse::Err {
            error: crate::domain::errors::ErrorDto {
                codigo: "CONCURRENCY_ERROR".to_string(),
                mensaje: "Error de bloqueo interno de base de datos".to_string(),
            },
        },
    };

    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::from(Err(e)),
    };

    let solo_activas = payload.and_then(|p| p.solo_activas).unwrap_or(true);
    let mut repo = CatalogoRepository::new(&mut conn);
    ApiResponse::from(repo.listar_categorias(solo_activas))
}

#[tauri::command]
pub fn guardar_categoria(
    state: State<AppState>,
    payload: GuardarCategoriaPayload,
) -> ApiResponse<CategoriaReferencia> {
    let db = match state.db.lock() {
        Ok(guard) => guard,
        Err(_) => return ApiResponse::Err {
            error: crate::domain::errors::ErrorDto {
                codigo: "CONCURRENCY_ERROR".to_string(),
                mensaje: "Error de bloqueo interno de base de datos".to_string(),
            },
        },
    };

    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::from(Err(e)),
    };

    let cat_result = CategoriaReferencia::nueva(
        payload.id.unwrap_or_default(),
        payload.nombre,
        payload.icono,
        payload.orden.unwrap_or(0),
    );

    let mut cat = match cat_result {
        Ok(c) => c,
        Err(e) => return ApiResponse::from(Err(e)),
    };

    if let Some(act) = payload.activo {
        cat.activo = act;
    }

    let mut repo = CatalogoRepository::new(&mut conn);
    ApiResponse::from(repo.guardar_categoria(&cat))
}

