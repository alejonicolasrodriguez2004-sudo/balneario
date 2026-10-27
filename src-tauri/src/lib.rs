pub mod commands;
pub mod domain;
pub mod storage;

use std::sync::Mutex;
use commands::comanda_commands::{
    obtener_catalogos_referencia,
    crear_comanda,
    agregar_items_comanda,
    anular_comanda,
    cerrar_comanda,
    cancelar_item_comanda,
    obtener_comanda,
    listar_comandas,
    AppState,
};
use commands::cuentas_commands::{
    abrir_cuenta,
    obtener_cuenta,
    listar_cuentas_activas,
    registrar_pago,
    cerrar_cuenta_y_liberar,
    anular_pago,
    anular_cuenta,
    obtener_resumen_arqueo,
};
use commands::catalogo_commands::{
    listar_catalogo_completo,
    crear_producto,
    actualizar_producto,
    actualizar_precio_producto,
    cambiar_disponibilidad_producto,
    dar_baja_producto,
    obtener_historial_precios,
    listar_categorias,
    guardar_categoria,
};
use commands::turnos_commands::{
    obtener_estado_turno_actual,
    abrir_turno_caja,
    registrar_retiro_caja,
    cerrar_turno_arqueo_ciego,
    listar_historial_turnos,
    obtener_detalle_turno,
    generar_comprobante_impresion_turno,
};
use storage::db::DatabaseManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_data_dir = dirs_next().unwrap_or_else(|| std::path::PathBuf::from("."));
    let db_path = app_data_dir.join("balneario_comandas.db");

    let db_manager = DatabaseManager::new(&db_path);
    if let Err(e) = db_manager.inicializar() {
        eprintln!("Error crítico al inicializar la base de datos local SQLite: {}", e);
    }

    tauri::Builder::default()
        .manage(AppState {
            db: Mutex::new(db_manager),
        })
        .invoke_handler(tauri::generate_handler![
            obtener_catalogos_referencia,
            crear_comanda,
            agregar_items_comanda,
            anular_comanda,
            cerrar_comanda,
            cancelar_item_comanda,
            obtener_comanda,
            listar_comandas,
            abrir_cuenta,
            obtener_cuenta,
            listar_cuentas_activas,
            registrar_pago,
            cerrar_cuenta_y_liberar,
            anular_pago,
            anular_cuenta,
            obtener_resumen_arqueo,
            listar_catalogo_completo,
            crear_producto,
            actualizar_producto,
            actualizar_precio_producto,
            cambiar_disponibilidad_producto,
            dar_baja_producto,
            obtener_historial_precios,
            listar_categorias,
            guardar_categoria,
            obtener_estado_turno_actual,
            abrir_turno_caja,
            registrar_retiro_caja,
            cerrar_turno_arqueo_ciego,
            listar_historial_turnos,
            obtener_detalle_turno,
            generar_comprobante_impresion_turno,
        ])
        .run(tauri::generate_context!())
        .expect("Error al ejecutar la aplicación Tauri de Gestión de Comandas");
}

fn dirs_next() -> Option<std::path::PathBuf> {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        Some(std::path::PathBuf::from(local_app_data).join("BalnearioApp"))
    } else {
        Some(std::path::PathBuf::from("./data"))
    }
}
