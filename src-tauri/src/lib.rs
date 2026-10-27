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

