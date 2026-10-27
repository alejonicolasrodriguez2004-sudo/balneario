#[cfg(test)]
mod tests {
    use balneario_app::domain::catalogo::{CategoriaReferencia, ProductoReferencia};
    use balneario_app::domain::entities::{Comanda, ItemComanda};
    use balneario_app::domain::errors::DomainError;
    use balneario_app::storage::catalogo_repo::CatalogoRepository;
    use balneario_app::storage::comanda_repo::ComandaRepository;
    use balneario_app::storage::db::DatabaseManager;

    #[test]
    fn test_catalogo_seed_y_creacion_producto() {
        let mut conn = DatabaseManager::conexion_memoria().expect("DB en memoria");
        let mut repo = CatalogoRepository::new(&mut conn);

        // 1. Listar catálogo inicial sembrado
        let catalogo = repo.listar_catalogo_completo(false).expect("Lista catálogo");
        assert!(!catalogo.categorias.is_empty(), "Deben existir categorías semilla");
        assert!(!catalogo.productos.is_empty(), "Deben existir productos semilla");

        // 2. Dar de alta nuevo producto
        let nuevo = ProductoReferencia::nuevo(
            "".to_string(),
            "Tostado Especial Crudo".to_string(),
            "Minutas".to_string(),
            4800.0,
            Some("Pan árabe tostado".to_string()),
            "2026-10-27T10:00:00Z".to_string(),
        ).unwrap();

        let creado = repo.crear_producto(&nuevo, "admin_playa").expect("Crea producto");
        assert_eq!(creado.id, "tostado-especial-crudo");
        assert_eq!(creado.precio_actual, 4800.0);

        // 3. Verificar que se creó entrada de auditoría inicial en historial_precios
        let historial = repo.obtener_historial_precios(&creado.id).expect("Obtiene historial");
        assert_eq!(historial.len(), 1);
        assert_eq!(historial[0].precio_anterior, 0.0);
        assert_eq!(historial[0].precio_nuevo, 4800.0);
    }

    #[test]
    fn test_actualizacion_precio_e_historial_inmutable() {
        let mut conn = DatabaseManager::conexion_memoria().expect("DB en memoria");
        let mut repo = CatalogoRepository::new(&mut conn);

        // Actualizar precio de licuado-frutilla de 2500 a 3000
        let actualizado = repo.actualizar_precio_producto(
            "licuado-frutilla",
            3000.0,
            "supervisor_caja",
            Some("Ajuste por costo de frutillas"),
            "2026-10-27T12:00:00Z",
        ).expect("Actualiza precio");

        assert_eq!(actualizado.precio_actual, 3000.0);

        // Verificar bitácora de historial
        let historial = repo.obtener_historial_precios("licuado-frutilla").expect("Historial");
        assert!(!historial.is_empty());
        assert_eq!(historial[0].precio_anterior, 2500.0);
        assert_eq!(historial[0].precio_nuevo, 3000.0);
        assert_eq!(historial[0].usuario, "supervisor_caja");
    }

    #[test]
    fn test_pausado_disponibilidad_y_baja_logica() {
        let mut conn = DatabaseManager::conexion_memoria().expect("DB en memoria");
        let mut repo = CatalogoRepository::new(&mut conn);

        // Pausar por falta de stock
        let pausado = repo.cambiar_disponibilidad_producto("rabas-porcion", false, "2026-10-27T13:00:00Z").unwrap();
        assert!(!pausado.disponible_para_venta);

        // Reactivar
        let reactivado = repo.cambiar_disponibilidad_producto("rabas-porcion", true, "2026-10-27T13:30:00Z").unwrap();
        assert!(reactivado.disponible_para_venta);

        // Dar de baja lógica
        let dado_de_baja = repo.dar_baja_producto("rabas-porcion", "2026-10-27T14:00:00Z").unwrap();
        assert!(!dado_de_baja.activo);
        assert!(!dado_de_baja.disponible_para_venta);

        // Verificar que ya no figura al listar solo activos
        let catalogo_activos = repo.listar_catalogo_completo(false).unwrap();
        assert!(!catalogo_activos.productos.iter().any(|p| p.id == "rabas-porcion"));

        // Pero sí figura si se solicitan inactivos
        let catalogo_todos = repo.listar_catalogo_completo(true).unwrap();
        assert!(catalogo_todos.productos.iter().any(|p| p.id == "rabas-porcion"));
    }

    #[test]
    fn test_proteccion_contra_eliminacion_fisica_restrict() {
        let mut conn = DatabaseManager::conexion_memoria().expect("DB en memoria");

        // 1. Crear una comanda con un ítem que referencia a 'licuado-frutilla'
        {
            let mut comanda_repo = ComandaRepository::new(&mut conn);
            let mut comanda = Comanda::nueva(
                "CMD-20261027-9999".to_string(),
                "carpa-01".to_string(),
                "Carpa 1".to_string(),
                "mozo_playa".to_string(),
                None,
            ).unwrap();

            comanda.agregar_item(ItemComanda::nuevo(
                "licuado-frutilla".to_string(),
                "Licuado de Frutilla".to_string(),
                2,
                2500.0,
                None,
            ).unwrap()).unwrap();

            comanda_repo.crear_comanda(&mut comanda).expect("Crea comanda con item");
        }

        // 2. Intentar eliminación física DELETE directa en SQLite
        // Debe fallar con error de Foreign Key Restriction (Constitución Art. VI)
        let delete_res = conn.execute(
            "DELETE FROM productos_referencia WHERE id = 'licuado-frutilla';",
            [],
        );

        assert!(
            delete_res.is_err(),
            "La base de datos SQLite debe impedir la eliminación física de un producto con órdenes emitidas"
        );
    }
}

