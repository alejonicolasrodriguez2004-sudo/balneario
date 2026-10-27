// src-tauri/src/commands/cuentas_commands.rs
// Controladores IPC para operaciones de Cuentas, Cobros y Caja (Feature 002)

use serde::{Deserialize, Serialize};
use tauri::State;

use super::comanda_commands::{ApiResponse, AppState};
use crate::domain::cuentas::{Cuenta, CuentaDetallada};
use crate::domain::errors::DomainError;
use crate::domain::pagos::{MedioPago, Pago, ResumenArqueo};
use crate::storage::cuentas_repo::CuentasRepository;

#[derive(Debug, Deserialize)]
pub struct AbrirCuentaPayload {
    pub ubicacion_id: String,
    pub operador: String,
}

#[derive(Debug, Deserialize)]
pub struct ObtenerCuentaPayload {
    pub cuenta_id: i64,
}

#[derive(Debug, Deserialize)]
pub struct RegistrarPagoPayload {
    pub cuenta_id: i64,
    pub medio_pago: MedioPago,
    pub monto: f64,
    pub monto_entregado: Option<f64>,
    pub referencia_externa: Option<String>,
    pub operador: String,
    pub token_idempotencia: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
pub struct RegistrarPagoResult {
    pub cuenta_actualizada: Cuenta,
    pub pago_registrado: Pago,
    pub vuelto_a_entregar: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct CerrarCuentaPayload {
    pub cuenta_id: i64,
    pub operador: String,
}

#[derive(Debug, Deserialize)]
pub struct AnularPagoPayload {
    pub cuenta_id: i64,
    pub pago_id: i64,
    pub motivo: String,
    pub operador: String,
}

#[derive(Debug, Deserialize)]
pub struct AnularCuentaPayload {
    pub cuenta_id: i64,
    pub motivo: String,
    pub operador: String,
}

#[tauri::command]
pub fn abrir_cuenta(
    state: State<'_, AppState>,
    payload: AbrirCuentaPayload,
) -> ApiResponse<CuentaDetallada> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let mut repo = CuentasRepository::new(&mut conn);
    repo.abrir_cuenta(&payload.ubicacion_id, &payload.operador).into()
}

#[tauri::command]
pub fn obtener_cuenta(
    state: State<'_, AppState>,
    payload: ObtenerCuentaPayload,
) -> ApiResponse<CuentaDetallada> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let mut repo = CuentasRepository::new(&mut conn);
    repo.obtener_cuenta(payload.cuenta_id).into()
}

#[tauri::command]
pub fn listar_cuentas_activas(
    state: State<'_, AppState>,
) -> ApiResponse<Vec<Cuenta>> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let mut repo = CuentasRepository::new(&mut conn);
    repo.listar_cuentas_activas().into()
}

#[tauri::command]
pub fn registrar_pago(
    state: State<'_, AppState>,
    payload: RegistrarPagoPayload,
) -> ApiResponse<RegistrarPagoResult> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let token = payload.token_idempotencia.unwrap_or_default();
    let mut repo = CuentasRepository::new(&mut conn);
    match repo.registrar_pago(
        payload.cuenta_id,
        payload.medio_pago,
        payload.monto,
        payload.monto_entregado,
        payload.referencia_externa,
        &payload.operador,
        &token,
    ) {
        Ok((cuenta_actualizada, pago_registrado, vuelto_a_entregar)) => {
            ApiResponse::Ok {
                data: RegistrarPagoResult {
                    cuenta_actualizada,
                    pago_registrado,
                    vuelto_a_entregar,
                },
            }
        }
        Err(err) => ApiResponse::Err { error: err.into() },
    }
}

#[tauri::command]
pub fn cerrar_cuenta_y_liberar(
    state: State<'_, AppState>,
    payload: CerrarCuentaPayload,
) -> ApiResponse<Cuenta> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let mut repo = CuentasRepository::new(&mut conn);
    repo.cerrar_cuenta_y_liberar(payload.cuenta_id, &payload.operador).into()
}

#[tauri::command]
pub fn anular_pago(
    state: State<'_, AppState>,
    payload: AnularPagoPayload,
) -> ApiResponse<CuentaDetallada> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let mut repo = CuentasRepository::new(&mut conn);
    repo.anular_pago(payload.cuenta_id, payload.pago_id, &payload.motivo, &payload.operador).into()
}

#[tauri::command]
pub fn anular_cuenta(
    state: State<'_, AppState>,
    payload: AnularCuentaPayload,
) -> ApiResponse<Cuenta> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let mut repo = CuentasRepository::new(&mut conn);
    repo.anular_cuenta(payload.cuenta_id, &payload.motivo, &payload.operador).into()
}

#[tauri::command]
pub fn obtener_resumen_arqueo(
    state: State<'_, AppState>,
) -> ApiResponse<ResumenArqueo> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let mut repo = CuentasRepository::new(&mut conn);
    repo.obtener_resumen_arqueo().into()
}

