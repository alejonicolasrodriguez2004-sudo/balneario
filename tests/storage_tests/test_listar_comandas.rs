#[cfg(test)]
mod tests {
    use balneario_app::domain::entities::{Comanda, ItemComanda};
    use balneario_app::storage::db::DatabaseManager;
    use balneario_app::storage::comanda_repo::ComandaRepository;

    #[test]
    fn test_listado_y_filtrado_comandas() {
        let mut conn = DatabaseManager::conexion_memoria().expect("DB en memoria");
        let mut repo = ComandaRepository::new(&mut conn);

        // Crear Comanda 1 en Carpa 12
        let mut c1 = Comanda::nueva(
            "CMD-001".to_string(),
            "carpa-12".to_string(),
            "Carpa 12".to_string(),
            "operador_1".to_string(),
            None,
        ).unwrap();
        c1.agregar_item(ItemComanda::nuevo("licuado-frutilla".to_string(), "Licuado".to_string(), 1, 2500.0, None).unwrap()).unwrap();
        repo.crear_comanda(&mut c1).unwrap();

        // Crear Comanda 2 en Sombrilla 4
        let mut c2 = Comanda::nueva(
            "CMD-002".to_string(),
            "sombrilla-04".to_string(),
            "Sombrilla 4".to_string(),
            "operador_1".to_string(),
            None,
        ).unwrap();
        c2.agregar_item(ItemComanda::nuevo("tostado-mixto".to_string(), "Tostado".to_string(), 2, 3500.0, None).unwrap()).unwrap();
        repo.crear_comanda(&mut c2).unwrap();

        // Listar todas
        let todas = repo.listar_comandas(None, None).unwrap();
        assert_eq!(todas.len(), 2);

        // Filtrar por ubicación
        let por_ubicacion = repo.listar_comandas(None, Some("carpa-12")).unwrap();
        assert_eq!(por_ubicacion.len(), 1);
        assert_eq!(por_ubicacion[0].ubicacion_id, "carpa-12");

        // Filtrar por estado Abierta
        let abiertas = repo.listar_comandas(Some("Abierta"), None).unwrap();
        assert_eq!(abiertas.len(), 2);

        // Anular una y filtrar
        repo.anular_comanda(c1.id.unwrap(), "Tormenta de viento", "supervisor").unwrap();
        let anuladas = repo.listar_comandas(Some("Anulada"), None).unwrap();
        assert_eq!(anuladas.len(), 1);
        assert_eq!(anuladas[0].id, c1.id);
    }
}

