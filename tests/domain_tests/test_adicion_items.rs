#[cfg(test)]
mod tests {
    use balneario_app::domain::entities::{Comanda, ItemComanda};
    use balneario_app::domain::errors::DomainError;

    #[test]
    fn test_adicion_incremental_actualiza_total() {
        let mut comanda = Comanda::nueva(
            "CMD-0010".to_string(),
            "carpa-12".to_string(),
            "Carpa 12".to_string(),
            "operador_test".to_string(),
            None,
        ).unwrap();

        // Primera ronda: 2 licuados a $2500
        let item1 = ItemComanda::nuevo("licuado-frutilla".to_string(), "Licuado".to_string(), 2, 2500.0, None).unwrap();
        comanda.agregar_item(item1).unwrap();
        comanda.confirmar_apertura().unwrap();

        assert_eq!(comanda.total, 5000.0);
        assert_eq!(comanda.items.len(), 1);

        // Segunda ronda posterior: 1 tostado a $3500
        let item2 = ItemComanda::nuevo("tostado-mixto".to_string(), "Tostado".to_string(), 1, 3500.0, None).unwrap();
        comanda.agregar_item(item2).unwrap();

        assert_eq!(comanda.total, 8500.0);
        assert_eq!(comanda.items.len(), 2);
    }

    #[test]
    fn test_rechaza_adicion_en_comanda_cerrada() {
        let mut comanda = Comanda::nueva(
            "CMD-0011".to_string(),
            "mesa-04".to_string(),
            "Mesa 4".to_string(),
            "operador_test".to_string(),
            None,
        ).unwrap();

        let item1 = ItemComanda::nuevo("agua-mineral".to_string(), "Agua".to_string(), 1, 1500.0, None).unwrap();
        comanda.agregar_item(item1).unwrap();
        comanda.confirmar_apertura().unwrap();

        // Cierre operativo
        comanda.cerrar().unwrap();

        // Intento de agregar nueva ronda en comanda cerrada
        let item2 = ItemComanda::nuevo("cafe-cortado".to_string(), "Café".to_string(), 1, 1800.0, None).unwrap();
        let err = comanda.agregar_item(item2).unwrap_err();

        assert_eq!(err, DomainError::ComandaEstadoInvalido("Cerrada".to_string()));
    }
}

