// src-tauri/src/commands/turnos_commands.rs
// Controladores IPC para operaciones de Turnos de Caja, Arqueo Ciego y Sangrías (Feature 004)

use serde::{Deserialize, Serialize};
use tauri::State;

use super::comanda_commands::{ApiResponse, AppState};
use crate::domain::errors::DomainError;
use crate::domain::turnos::{
    generar_ticket_80mm, DetalleTurnoCompleto, EstadoTurnoActual, RetiroCaja, TurnoCaja,
};
use crate::storage::turnos_repo::TurnosRepository;

#[derive(Debug, Deserialize)]
pub struct AbrirTurnoPayload {
    pub operador: String,
    pub fondo_inicial: f64,
}

#[derive(Debug, Deserialize)]
pub struct RegistrarRetiroPayload {
    pub monto: f64,
    pub operador: String,
    pub receptor: String,
    pub motivo: String,
}

#[derive(Debug, Deserialize)]
pub struct CerrarTurnoArqueoCiegoPayload {
    pub declarado_efectivo: f64,
    pub declarado_debito: Option<f64>,
    pub declarado_credito: Option<f64>,
    pub declarado_transferencia: Option<f64>,
    pub justificacion: Option<String>,
    pub observaciones: Option<String>,
    pub operador: String,
}

#[derive(Debug, Deserialize, Default)]
pub struct ListarTurnosPayload {
    pub filtro_estado: Option<String>,
    pub limite: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct ObtenerDetalleTurnoPayload {
    pub turno_id: i64,
}

#[tauri::command]
pub fn obtener_estado_turno_actual(
    state: State<'_, AppState>,
) -> ApiResponse<EstadoTurnoActual> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let mut repo = TurnosRepository::new(&mut conn);
    repo.obtener_estado_turno_actual().into()
}

#[tauri::command]
pub fn abrir_turno_caja(
    state: State<'_, AppState>,
    payload: AbrirTurnoPayload,
) -> ApiResponse<TurnoCaja> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let mut repo = TurnosRepository::new(&mut conn);
    repo.abrir_turno(&payload.operador, payload.fondo_inicial).into()
}

#[tauri::command]
pub fn registrar_retiro_caja(
    state: State<'_, AppState>,
    payload: RegistrarRetiroPayload,
) -> ApiResponse<RetiroCaja> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let mut repo = TurnosRepository::new(&mut conn);

    let turno_activo = match repo.obtener_turno_activo() {
        Ok(Some(t)) => t,
        Ok(None) => return Err(DomainError::NoHayTurnoAbierto).into(),
        Err(e) => return Err(e).into(),
    };

    repo.registrar_retiro(
        turno_activo.id,
        payload.monto,
        &payload.operador,
        &payload.receptor,
        &payload.motivo,
    )
    .into()
}

#[tauri::command]
pub fn cerrar_turno_arqueo_ciego(
    state: State<'_, AppState>,
    payload: CerrarTurnoArqueoCiegoPayload,
) -> ApiResponse<DetalleTurnoCompleto> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let mut repo = TurnosRepository::new(&mut conn);

    let turno_activo = match repo.obtener_turno_activo() {
        Ok(Some(t)) => t,
        Ok(None) => return Err(DomainError::NoHayTurnoAbierto).into(),
        Err(e) => return Err(e).into(),
    };

    let turno_id = turno_activo.id;

    let res = repo.cerrar_turno_arqueo_ciego(
        turno_id,
        &payload.operador,
        payload.declarado_efectivo,
        payload.declarado_debito.unwrap_or(0.0),
        payload.declarado_credito.unwrap_or(0.0),
        payload.declarado_transferencia.unwrap_or(0.0),
        payload.justificacion,
        payload.observaciones,
    );

    match res {
        Ok(_) => repo.obtener_detalle_turno(turno_id).into(),
        Err(e) => Err(e).into(),
    }
}

#[tauri::command]
pub fn listar_historial_turnos(
    state: State<'_, AppState>,
    payload: Option<ListarTurnosPayload>,
) -> ApiResponse<Vec<TurnoCaja>> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let limite = payload.and_then(|p| p.limite);
    let mut repo = TurnosRepository::new(&mut conn);
    repo.listar_historial_turnos(limite).into()
}

#[tauri::command]
pub fn obtener_detalle_turno(
    state: State<'_, AppState>,
    payload: ObtenerDetalleTurnoPayload,
) -> ApiResponse<DetalleTurnoCompleto> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let mut repo = TurnosRepository::new(&mut conn);
    repo.obtener_detalle_turno(payload.turno_id).into()
}

#[tauri::command]
pub fn generar_comprobante_impresion_turno(
    state: State<'_, AppState>,
    payload: ObtenerDetalleTurnoPayload,
) -> ApiResponse<String> {
    let db_guard = match state.db.lock() {
        Ok(g) => g,
        Err(e) => return Err(DomainError::ErrorAlmacenamiento(e.to_string())).into(),
    };

    let mut conn = match db_guard.conectar() {
        Ok(c) => c,
        Err(e) => return Err(e).into(),
    };

    let mut repo = TurnosRepository::new(&mut conn);
    let detalle_res = repo.obtener_detalle_turno(payload.turno_id);
    match detalle_res {
        Ok(detalle) => {
            let ticket = generar_ticket_80mm(&detalle);
            Ok(ticket).into()
        }
        Err(e) => Err(e).into(),
    }
}
