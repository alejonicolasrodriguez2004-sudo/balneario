#[cfg(test)]
mod tests {
    use balneario_app::domain::entities::{Comanda, ItemComanda};
    use balneario_app::domain::errors::DomainError;
    use balneario_app::domain::state::{EstadoComanda, EstadoItem};

    #[test]
    fn test_anulacion_exige_motivo_minimo() {
        let mut comanda = Comanda::nueva(
            "CMD-0020".to_string(),
            "carpa-01".to_string(),
            "Carpa 1".to_string(),
            "operador_test".to_string(),
            None,
        ).unwrap();
        comanda.agregar_item(ItemComanda::nuevo("licuado-frutilla".to_string(), "Licuado".to_string(), 1, 2500.0, None).unwrap()).unwrap();
        comanda.confirmar_apertura().unwrap();

        // Intento con motivo vacío o demasiado corto (< 4 caracteres)
        let err = comanda.anular("no", "operador_test").unwrap_err();
        assert_eq!(err, DomainError::MotivoRequerido);

        // Anulación válida con justificación
        comanda.anular("Cliente se retira por lluvia fuerte", "encargado").unwrap();
        assert_eq!(comanda.estado, EstadoComanda::Anulada);
        assert_eq!(comanda.motivo_anulacion.as_deref(), Some("Cliente se retira por lluvia fuerte"));
    }

    #[test]
    fn test_cancelacion_item_recalcula_total_sin_borrar_registro() {
        let mut comanda = Comanda::nueva(
            "CMD-0021".to_string(),
            "mesa-01".to_string(),
            "Mesa 1".to_string(),
            "operador_test".to_string(),
            None,
        ).unwrap();

        let mut item1 = ItemComanda::nuevo("tostado-mixto".to_string(), "Tostado".to_string(), 1, 3500.0, None).unwrap();
        item1.id = Some(101);

        let mut item2 = ItemComanda::nuevo("cerveza-artesanal".to_string(), "Cerveza".to_string(), 1, 3200.0, None).unwrap();
        item2.id = Some(102);

        comanda.agregar_item(item1).unwrap();
        comanda.agregar_item(item2).unwrap();
        comanda.confirmar_apertura().unwrap();

        assert_eq!(comanda.total, 6700.0);

        // Cancelar ítem 101
        comanda.cancelar_item(101, "Error de tipeo del mozo", "operador_test").unwrap();

        // El total ahora debe ser sólo el ítem 102 ($3200)
        assert_eq!(comanda.total, 3200.0);

        // El ítem 101 se conserva en memoria (baja lógica / soft-delete)
        let cancelado = comanda.items.iter().find(|i| i.id == Some(101)).unwrap();
        assert_eq!(cancelado.estado, EstadoItem::Cancelado);
        assert_eq!(cancelado.motivo_cancelacion.as_deref(), Some("Error de tipeo del mozo"));
    }
}

