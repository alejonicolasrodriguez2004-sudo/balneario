#[cfg(test)]
mod tests {
    use balneario_app::domain::catalogo::{CategoriaReferencia, ProductoReferencia};
    use balneario_app::domain::entities::ItemComanda;
    use balneario_app::domain::errors::DomainError;

    // ==========================================
    // USER STORY 1: Validación y Alta de Productos (T007)
    // ==========================================

    #[test]
    fn test_creacion_producto_valido() {
        let producto = ProductoReferencia::nuevo(
            "".to_string(), // Slug vacío debe autogenerarse
            "Tostado Especial Crudo".to_string(),
            "Minutas".to_string(),
            4800.0,
            Some("Pan árabe con jamón crudo y queso".to_string()),
            "2026-10-27T10:00:00Z".to_string(),
        ).expect("Debe crear producto válido");

        assert_eq!(producto.id, "tostado-especial-crudo");
        assert_eq!(producto.nombre, "Tostado Especial Crudo");
        assert_eq!(producto.categoria, "Minutas");
        assert_eq!(producto.precio_actual, 4800.0);
        assert!(producto.disponible_para_venta);
        assert!(producto.activo);
    }

    #[test]
    fn test_rechaza_nombre_vacio() {
        let err = ProductoReferencia::nuevo(
            "prod-1".to_string(),
            "   ".to_string(),
            "Minutas".to_string(),
            2000.0,
            None,
            "2026-10-27T10:00:00Z".to_string(),
        ).unwrap_err();

        assert!(matches!(err, DomainError::Validacion(_)));
    }

    #[test]
    fn test_rechaza_categoria_vacia() {
        let err = ProductoReferencia::nuevo(
            "prod-1".to_string(),
            "Papas Fritas".to_string(),
            "   ".to_string(),
            2000.0,
            None,
            "2026-10-27T10:00:00Z".to_string(),
        ).unwrap_err();

        assert!(matches!(err, DomainError::Validacion(_)));
    }

    #[test]
    fn test_rechaza_precio_cero_o_negativo() {
        let err_cero = ProductoReferencia::nuevo(
            "".to_string(),
            "Agua Saborizada".to_string(),
            "Bebidas".to_string(),
            0.0,
            None,
            "2026-10-27T10:00:00Z".to_string(),
        ).unwrap_err();

        assert!(matches!(err_cero, DomainError::PrecioInvalido));

        let err_negativo = ProductoReferencia::nuevo(
            "".to_string(),
            "Agua Saborizada".to_string(),
            "Bebidas".to_string(),
            -500.0,
            None,
            "2026-10-27T10:00:00Z".to_string(),
        ).unwrap_err();

        assert!(matches!(err_negativo, DomainError::PrecioInvalido));
    }

    #[test]
    fn test_generacion_slug_con_acentos_y_espacios() {
        let slug = ProductoReferencia::generar_slug("Café con Leche & Medialuna Porteña!");
        assert_eq!(slug, "cafe-con-leche-medialuna-portena");
    }

    // ==========================================
    // USER STORY 2: Blindaje Histórico de Precios (T015)
    // ==========================================

    #[test]
    fn test_actualizacion_precio_genera_historial_y_respeta_inmutabilidad() {
        let mut producto = ProductoReferencia::nuevo(
            "licuado-frutilla".to_string(),
            "Licuado de Frutilla".to_string(),
            "Bebidas".to_string(),
            2500.0,
            None,
            "2026-10-27T10:00:00Z".to_string(),
        ).unwrap();

        // Simulación de ítem de comanda emitido previamente con el precio congelado (Art. VI)
        let item_comanda_preexistente = ItemComanda::new(
            1,
            producto.id.clone(),
            producto.nombre.clone(),
            2,
            producto.precio_actual, // $2.500 unitario
            None,
            "2026-10-27T10:05:00Z".to_string(),
        ).unwrap();

        assert_eq!(item_comanda_preexistente.precio_unitario, 2500.0);
        assert_eq!(item_comanda_preexistente.subtotal, 5000.0);

        // Actualizamos el precio del producto a $3.000
        let historial = producto.actualizar_precio(
            3000.0,
            "admin_caja",
            Some("Ajuste quincenal de insumos"),
            "2026-10-27T11:00:00Z",
        ).expect("La actualización de precio debe ser exitosa");

        // El producto ahora tiene precio $3.000 y actualizado_en nuevo
        assert_eq!(producto.precio_actual, 3000.0);
        assert_eq!(producto.actualizado_en, "2026-10-27T11:00:00Z");

        // El registro de auditoría registra el salto de $2.500 a $3.000
        assert_eq!(historial.precio_anterior, 2500.0);
        assert_eq!(historial.precio_nuevo, 3000.0);
        assert_eq!(historial.usuario, "admin_caja");
        assert_eq!(historial.motivo.as_deref(), Some("Ajuste quincenal de insumos"));

        // Comprobación crítica: El ítem emitido con anterioridad sigue INMUTABLE a $2.500
        assert_eq!(item_comanda_preexistente.precio_unitario, 2500.0);
        assert_eq!(item_comanda_preexistente.subtotal, 5000.0);

        // Nuevo ítem emitido luego de la actualización tomará el nuevo precio
        let item_comanda_nuevo = ItemComanda::new(
            2,
            producto.id.clone(),
            producto.nombre.clone(),
            2,
            producto.precio_actual, // $3.000 unitario
            None,
            "2026-10-27T11:05:00Z".to_string(),
        ).unwrap();

        assert_eq!(item_comanda_nuevo.precio_unitario, 3000.0);
        assert_eq!(item_comanda_nuevo.subtotal, 6000.0);
    }

    #[test]
    fn test_rechaza_actualizacion_precio_cero_o_negativo() {
        let mut producto = ProductoReferencia::nuevo(
            "licuado-frutilla".to_string(),
            "Licuado de Frutilla".to_string(),
            "Bebidas".to_string(),
            2500.0,
            None,
            "2026-10-27T10:00:00Z".to_string(),
        ).unwrap();

        let err = producto.actualizar_precio(0.0, "admin", None, "2026-10-27T11:00:00Z").unwrap_err();
        assert!(matches!(err, DomainError::PrecioInvalido));

        let err_neg = producto.actualizar_precio(-100.0, "admin", None, "2026-10-27T11:00:00Z").unwrap_err();
        assert!(matches!(err_neg, DomainError::PrecioInvalido));
        assert_eq!(producto.precio_actual, 2500.0); // Precio original intacto
    }

    // ==========================================
    // USER STORY 3: Pausado de Disponibilidad (T020)
    // ==========================================

    #[test]
    fn test_pausado_y_reactivacion_de_disponibilidad() {
        let mut producto = ProductoReferencia::nuevo(
            "rabas-porcion".to_string(),
            "Porción de Rabas".to_string(),
            "Minutas".to_string(),
            7500.0,
            None,
            "2026-10-27T10:00:00Z".to_string(),
        ).unwrap();

        assert!(producto.disponible_para_venta);

        // Pausar por falta de insumo en cocina
        producto.cambiar_disponibilidad(false, "2026-10-27T12:30:00Z");
        assert!(!producto.disponible_para_venta);
        assert_eq!(producto.actualizado_en, "2026-10-27T12:30:00Z");

        // Reactivar cuando ingresa nuevo stock
        producto.cambiar_disponibilidad(true, "2026-10-27T13:00:00Z");
        assert!(producto.disponible_para_venta);
        assert_eq!(producto.actualizado_en, "2026-10-27T13:00:00Z");
    }

    #[test]
    fn test_baja_logica_desactiva_y_deshabilita_producto() {
        let mut producto = ProductoReferencia::nuevo(
            "plato-temporada-pasada".to_string(),
            "Plato Antiguo".to_string(),
            "Minutas".to_string(),
            4000.0,
            None,
            "2026-10-27T10:00:00Z".to_string(),
        ).unwrap();

        producto.dar_de_baja("2026-10-27T14:00:00Z");
        assert!(!producto.activo);
        assert!(!producto.disponible_para_venta);
        assert_eq!(producto.actualizado_en, "2026-10-27T14:00:00Z");
    }

    // ==========================================
    // Categorías de Referencia
    // ==========================================

    #[test]
    fn test_creacion_categoria_valida() {
        let categoria = CategoriaReferencia::nueva(
            "".to_string(),
            "Tragos & Cócteles".to_string(),
            Some("Martini".to_string()),
            10,
        ).expect("Debe crear categoría válida");

        assert_eq!(categoria.id, "tragos-cocteles");
        assert_eq!(categoria.nombre, "Tragos & Cócteles");
        assert_eq!(categoria.icono.as_deref(), Some("Martini"));
        assert_eq!(categoria.orden, 10);
        assert!(categoria.activo);
    }
}

