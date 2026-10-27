use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;
use crate::domain::entities::{Comanda, ItemComanda, Producto, Ubicacion};
use crate::domain::errors::ErrorDto;
use crate::storage::db::DatabaseManager;
use crate::storage::comanda_repo::ComandaRepository;
use crate::storage::reference_repo::ReferenceRepository;

pub struct AppState {
    pub db: Mutex<DatabaseManager>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "success")]
pub enum ApiResponse<T> {
    #[serde(rename = "true")]
    Ok { data: T },
    #[serde(rename = "false")]
    Err { error: ErrorDto },
}

impl<T> From<Result<T, crate::domain::errors::DomainError>> for ApiResponse<T> {
    fn from(res: Result<T, crate::domain::errors::DomainError>) -> Self {
        match res {
            Ok(data) => ApiResponse::Ok { data },
            Err(err) => ApiResponse::Err { error: err.into() },
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct ItemInput {
    pub producto_id: String,
    pub cantidad: i64,
    pub observaciones: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CrearComandaPayload {
    pub ubicacion_id: String,
    pub items: Vec<ItemInput>,
    pub operador: String,
    pub token_idempotencia: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AgregarItemsPayload {
    pub comanda_id: i64,
    pub items: Vec<ItemInput>,
    pub operador: String,
}

#[derive(Debug, Deserialize)]
pub struct AnularComandaPayload {
    pub comanda_id: i64,
    pub motivo: String,
    pub operador: String,
}

#[derive(Debug, Deserialize)]
pub struct CerrarComandaPayload {
    pub comanda_id: i64,
    pub operador: String,
}

#[derive(Debug, Deserialize)]
pub struct CancelarItemPayload {
    pub comanda_id: i64,
    pub item_id: i64,
    pub motivo: String,
    pub operador: String,
}

#[derive(Debug, Deserialize)]
pub struct ListarComandasPayload {
    pub filtro_estado: Option<String>,
    pub filtro_ubicacion_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CatalogosReferenciaDto {
    pub ubicaciones: Vec<Ubicacion>,
    pub productos: Vec<Producto>,
}

#[tauri::command]
pub fn obtener_catalogos_referencia(state: State<'_, AppState>) -> ApiResponse<CatalogosReferenciaDto> {
    let db = state.db.lock().unwrap();
    let conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::Err { error: e.into() },
    };

    let repo = ReferenceRepository::new(&conn);
    let ubicaciones = match repo.listar_ubicaciones() {
        Ok(u) => u,
        Err(e) => return ApiResponse::Err { error: e.into() },
    };
    let productos = match repo.listar_productos() {
        Ok(p) => p,
        Err(e) => return ApiResponse::Err { error: e.into() },
    };

    ApiResponse::Ok {
        data: CatalogosReferenciaDto {
            ubicaciones,
            productos,
        },
    }
}

#[tauri::command]
pub fn crear_comanda(state: State<'_, AppState>, payload: CrearComandaPayload) -> ApiResponse<Comanda> {
    let db = state.db.lock().unwrap();
    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::Err { error: e.into() },
    };

    // Obtener y validar ubicación
    let ubicacion = {
        let ref_repo = ReferenceRepository::new(&conn);
        match ref_repo.obtener_ubicacion(&payload.ubicacion_id) {
            Ok(u) => u,
            Err(e) => return ApiResponse::Err { error: e.into() },
        }
    };

    let mut comanda = match Comanda::nueva(
        String::new(),
        ubicacion.id,
        ubicacion.nombre,
        payload.operador,
        payload.token_idempotencia,
    ) {
        Ok(c) => c,
        Err(e) => return ApiResponse::Err { error: e.into() },
    };

    // Cargar productos y congelar precios históricos
    {
        let ref_repo = ReferenceRepository::new(&conn);
        for item_input in payload.items {
            let prod = match ref_repo.obtener_producto(&item_input.producto_id) {
                Ok(p) => p,
                Err(e) => return ApiResponse::Err { error: e.into() },
            };

            let item = match ItemComanda::nuevo(
                prod.id,
                prod.nombre,
                item_input.cantidad,
                prod.precio_actual, // Congelado al momento del pedido
                item_input.observaciones,
            ) {
                Ok(it) => it,
                Err(e) => return ApiResponse::Err { error: e.into() },
            };

            if let Err(e) = comanda.agregar_item(item) {
                return ApiResponse::Err { error: e.into() };
            }
        }
    }

    let mut repo = ComandaRepository::new(&mut conn);
    let comanda_id = match repo.crear_comanda(&mut comanda) {
        Ok(id) => id,
        Err(e) => return ApiResponse::Err { error: e.into() },
    };

    match repo.obtener_comanda(comanda_id) {
        Ok(c) => ApiResponse::Ok { data: c },
        Err(e) => ApiResponse::Err { error: e.into() },
    }
}

#[tauri::command]
pub fn agregar_items_comanda(state: State<'_, AppState>, payload: AgregarItemsPayload) -> ApiResponse<Comanda> {
    let db = state.db.lock().unwrap();
    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::Err { error: e.into() },
    };

    let mut items_a_agregar = Vec::new();
    {
        let ref_repo = ReferenceRepository::new(&conn);
        for item_input in payload.items {
            let prod = match ref_repo.obtener_producto(&item_input.producto_id) {
                Ok(p) => p,
                Err(e) => return ApiResponse::Err { error: e.into() },
            };

            let item = match ItemComanda::nuevo(
                prod.id,
                prod.nombre,
                item_input.cantidad,
                prod.precio_actual,
                item_input.observaciones,
            ) {
                Ok(it) => it,
                Err(e) => return ApiResponse::Err { error: e.into() },
            };
            items_a_agregar.push(item);
        }
    }

    let mut repo = ComandaRepository::new(&mut conn);
    repo.agregar_items(payload.comanda_id, items_a_agregar, &payload.operador).into()
}

#[tauri::command]
pub fn anular_comanda(state: State<'_, AppState>, payload: AnularComandaPayload) -> ApiResponse<Comanda> {
    let db = state.db.lock().unwrap();
    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::Err { error: e.into() },
    };

    let mut repo = ComandaRepository::new(&mut conn);
    repo.anular_comanda(payload.comanda_id, &payload.motivo, &payload.operador).into()
}

#[tauri::command]
pub fn cerrar_comanda(state: State<'_, AppState>, payload: CerrarComandaPayload) -> ApiResponse<Comanda> {
    let db = state.db.lock().unwrap();
    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::Err { error: e.into() },
    };

    let mut repo = ComandaRepository::new(&mut conn);
    repo.cerrar_comanda(payload.comanda_id, &payload.operador).into()
}

#[tauri::command]
pub fn cancelar_item_comanda(state: State<'_, AppState>, payload: CancelarItemPayload) -> ApiResponse<Comanda> {
    let db = state.db.lock().unwrap();
    let mut conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::Err { error: e.into() },
    };

    let mut repo = ComandaRepository::new(&mut conn);
    repo.cancelar_item(payload.comanda_id, payload.item_id, &payload.motivo, &payload.operador).into()
}

#[tauri::command]
pub fn obtener_comanda(state: State<'_, AppState>, comanda_id: i64) -> ApiResponse<Comanda> {
    let db = state.db.lock().unwrap();
    let conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::Err { error: e.into() },
    };

    let repo = ComandaRepository::new(&mut {conn});
    repo.obtener_comanda(comanda_id).into()
}

#[tauri::command]
pub fn listar_comandas(state: State<'_, AppState>, payload: ListarComandasPayload) -> ApiResponse<Vec<Comanda>> {
    let db = state.db.lock().unwrap();
    let conn = match db.conectar() {
        Ok(c) => c,
        Err(e) => return ApiResponse::Err { error: e.into() },
    };

    let repo = ComandaRepository::new(&mut {conn});
    repo.listar_comandas(payload.filtro_estado.as_deref(), payload.filtro_ubicacion_id.as_deref()).into()
}

