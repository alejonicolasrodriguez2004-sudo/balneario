#[cfg(test)]
mod tests {
    use balneario_app::domain::entities::{Comanda, ItemComanda};
    use balneario_app::domain::errors::DomainError;
    use balneario_app::domain::state::EstadoComanda;

    #[test]
    fn test_creacion_exitosa_comanda() {
        let mut comanda = Comanda::nueva(
            "CMD-20261027-0001".to_string(),
            "carpa-12".to_string(),
            "Carpa 12".to_string(),
            "operador_test".to_string(),
            Some("uuid-idempotencia-123".to_string()),
        ).expect("Debe crear la comanda");

        let item1 = ItemComanda::nuevo(
            "licuado-frutilla".to_string(),
            "Licuado de Frutilla".to_string(),
            2,
            2500.0,
            Some("sin azúcar".to_string()),
        ).expect("Debe crear ítem 1");

        let item2 = ItemComanda::nuevo(
            "tostado-mixto".to_string(),
            "Tostado Mixto".to_string(),
            1,
            3500.0,
            None,
        ).expect("Debe crear ítem 2");

        comanda.agregar_item(item1).unwrap();
        comanda.agregar_item(item2).unwrap();
        comanda.confirmar_apertura().unwrap();

        assert_eq!(comanda.estado, EstadoComanda::Abierta);
        assert_eq!(comanda.items.len(), 2);
        assert_eq!(comanda.total, 8500.0);
        assert_eq!(comanda.ubicacion_id, "carpa-12");
    }

    #[test]
    fn test_rechaza_comanda_vacia() {
        let mut comanda = Comanda::nueva(
            "CMD-0002".to_string(),
            "mesa-03".to_string(),
            "Mesa 3".to_string(),
            "operador_test".to_string(),
            None,
        ).unwrap();

        let err = comanda.confirmar_apertura().unwrap_err();
        assert_eq!(err, DomainError::ComandaVacia);
    }

    #[test]
    fn test_rechaza_item_cantidad_invalida() {
        let err = ItemComanda::nuevo(
            "cafe-cortado".to_string(),
            "Café Cortado".to_string(),
            0, // Inválido: <= 0
            1800.0,
            None,
        ).unwrap_err();

        assert_eq!(err, DomainError::CantidadInvalida);
    }

    #[test]
    fn test_inmutabilidad_precio_historico_congelado() {
        let mut comanda = Comanda::nueva(
            "CMD-0003".to_string(),
            "sombrilla-04".to_string(),
            "Sombrilla 4".to_string(),
            "operador_test".to_string(),
            None,
        ).unwrap();

        // Se agrega a precio $2.500
        let item = ItemComanda::nuevo(
            "licuado-frutilla".to_string(),
            "Licuado de Frutilla".to_string(),
            1,
            2500.0,
            None,
        ).unwrap();

        comanda.agregar_item(item).unwrap();
        comanda.confirmar_apertura().unwrap();

        // El precio unitario queda congelado en 2500.0
        assert_eq!(comanda.items[0].precio_unitario, 2500.0);
        assert_eq!(comanda.total, 2500.0);
    }
}

