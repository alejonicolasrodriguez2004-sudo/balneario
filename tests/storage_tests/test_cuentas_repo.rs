#[cfg(test)]
mod tests {
    use balneario_app::domain::cuentas::EstadoCuenta;
    use balneario_app::domain::entities::{Comanda, ItemComanda};
    use balneario_app::domain::errors::DomainError;
    use balneario_app::domain::pagos::MedioPago;
    use balneario_app::storage::comanda_repo::ComandaRepository;
    use balneario_app::storage::cuentas_repo::CuentasRepository;
    use balneario_app::storage::db::DatabaseManager;

    #[test]
    fn test_ciclo_completo_cuenta_pago_y_bloqueo_cierre() {
        let mut conn = DatabaseManager::conexion_memoria().expect("DB en memoria");

        // 1. Crear 2 comandas en Carpa 12
        {
            let mut comanda_repo = ComandaRepository::new(&mut conn);

            let mut c1 = Comanda::nueva(
                "CMD-001".to_string(),
                "carpa-12".to_string(),
                "Carpa 12".to_string(),
                "mozo_1".to_string(),
                None,
            ).unwrap();
            c1.agregar_item(ItemComanda::nuevo("licuado-frutilla".to_string(), "Licuado".to_string(), 2, 2500.0, None).unwrap()).unwrap();
            comanda_repo.crear_comanda(&mut c1).unwrap();

            let mut c2 = Comanda::nueva(
                "CMD-002".to_string(),
                "carpa-12".to_string(),
                "Carpa 12".to_string(),
                "mozo_1".to_string(),
                None,
            ).unwrap();
            c2.agregar_item(ItemComanda::nuevo("tostado-mixto".to_string(), "Tostado".to_string(), 1, 3500.0, None).unwrap()).unwrap();
            comanda_repo.crear_comanda(&mut c2).unwrap();
        }

        // 2. Abrir cuenta consolidada
        let mut cuentas_repo = CuentasRepository::new(&mut conn);
        let cuenta_detallada = cuentas_repo.abrir_cuenta("carpa-12", "cajero_1").expect("Abre cuenta consolidada");

        assert_eq!(cuenta_detallada.cuenta.total, 8500.0);
        assert_eq!(cuenta_detallada.cuenta.saldo_pendiente, 8500.0);
        assert_eq!(cuenta_detallada.comandas_asociadas.len(), 2);
        assert_eq!(cuenta_detallada.cuenta.estado, EstadoCuenta::Abierta);

        let cuenta_id = cuenta_detallada.cuenta.id;

        // 3. Intento de cierre prematuro con saldo impago (debe ser bloqueado taxativamente)
        let err_cierre = cuentas_repo.cerrar_cuenta_y_liberar(cuenta_id, "encargado_1").unwrap_err();
        assert_eq!(err_cierre, DomainError::SaldoPendiente);

        // 4. Registrar pago parcial en efectivo: paga $5.000 recibiendo $10.000 (vuelto: $5.000)
        let (cuenta_act1, pago1, vuelto) = cuentas_repo.registrar_pago(
            cuenta_id,
            MedioPago::Efectivo,
            5000.0,
            Some(10000.0),
            None,
            "cajero_1",
            "token-idemp-1",
        ).expect("Pago 1 registrado");

        assert_eq!(vuelto, Some(5000.0));
        assert_eq!(cuenta_act1.saldo_pendiente, 3500.0);
        assert_eq!(cuenta_act1.estado, EstadoCuenta::Abierta);

        // Segundo intento de cierre con saldo parcial restante (sigue bloqueado)
        let err_cierre_2 = cuentas_repo.cerrar_cuenta_y_liberar(cuenta_id, "encargado_1").unwrap_err();
        assert_eq!(err_cierre_2, DomainError::SaldoPendiente);

        // 5. Registrar segundo pago por el saldo restante ($3.500) con tarjeta de débito
        let (cuenta_act2, _, _) = cuentas_repo.registrar_pago(
            cuenta_id,
            MedioPago::TarjetaDebito,
            3500.0,
            None,
            Some("POS-00123".to_string()),
            "cajero_1",
            "token-idemp-2",
        ).expect("Pago 2 registrado");

        assert_eq!(cuenta_act2.saldo_pendiente, 0.0);
        assert_eq!(cuenta_act2.estado, EstadoCuenta::Pagada);

        // 6. Ahora que el saldo es 0, el cierre y liberación es exitoso
        let cuenta_cerrada = cuentas_repo.cerrar_cuenta_y_liberar(cuenta_id, "encargado_1").expect("Cierre exitoso");
        assert_eq!(cuenta_cerrada.estado, EstadoCuenta::Cerrada);
        assert!(cuenta_cerrada.cerrado_en.is_some());

        // 7. Verificar arqueo de turno
        let arqueo = cuentas_repo.obtener_resumen_arqueo().expect("Arqueo obtenido");
        assert_eq!(arqueo.total_efectivo, 5000.0);
        assert_eq!(arqueo.total_debito, 3500.0);
        assert_eq!(arqueo.total_recaudado, 8500.0);
        assert_eq!(arqueo.cantidad_pagos_activos, 2);
        assert_eq!(arqueo.cantidad_pagos_anulados, 0);
    }
}

