#[cfg(test)]
mod tests {
    use balneario_app::domain::entities::{Comanda, ItemComanda};
    use balneario_app::storage::db::DatabaseManager;
    use balneario_app::storage::comanda_repo::ComandaRepository;
    use tempfile::tempdir;

    #[test]
    fn test_resiliencia_sqlite_wal_persistencia_atomica() {
        let dir = tempdir().expect("Crear temp dir");
        let db_path = dir.path().join("resiliencia_test.db");

        // 1. Inicialización y creación de comanda en sesión 1
        {
            let manager = DatabaseManager::new(&db_path);
            manager.inicializar().expect("Inicializar DB con migraciones");

            let mut conn = manager.conectar().expect("Conectar DB");
            let mut repo = ComandaRepository::new(&mut conn);

            let mut comanda = Comanda::nueva(
                "CMD-WAL-001".to_string(),
                "carpa-12".to_string(),
                "Carpa 12".to_string(),
                "cajero_1".to_string(),
                Some("token-wal-1".to_string()),
            ).unwrap();

            comanda.agregar_item(ItemComanda::nuevo(
                "licuado-frutilla".to_string(),
                "Licuado de Frutilla".to_string(),
                2,
                2500.0,
                Some("sin azúcar".to_string()),
            ).unwrap()).unwrap();

            repo.crear_comanda(&mut comanda).expect("Guardar atómicamente");

            // Simula cierre abrupto: se suelta la conexión sin checkpoint manual
            drop(conn);
        }

        // 2. Reconexión en sesión 2 (simula reinicio tras corte de energía o crash)
        {
            let manager = DatabaseManager::new(&db_path);
            let conn = manager.conectar().expect("Reconectar a SQLite");

            // Validar que integrity_check pasa perfectamente tras recuperación de WAL
            manager.verificar_integridad(&conn).expect("Integridad debe ser OK");

            let mut conn_mut = conn;
            let repo = ComandaRepository::new(&mut conn_mut);

            let comandas = repo.listar_comandas(None, None).expect("Listar comandas recuperadas");
            assert_eq!(comandas.len(), 1);
            assert_eq!(comandas[0].codigo_visible, "CMD-WAL-001");
            assert_eq!(comandas[0].total, 5000.0);

            let comanda_detallada = repo.obtener_comanda(comandas[0].id.unwrap()).expect("Obtener detalle");
            assert_eq!(comanda_detallada.items.len(), 1);
            assert_eq!(comanda_detallada.items[0].precio_unitario, 2500.0);
            assert_eq!(comanda_detallada.items[0].observaciones.as_deref(), Some("sin azúcar"));
        }
    }
}

