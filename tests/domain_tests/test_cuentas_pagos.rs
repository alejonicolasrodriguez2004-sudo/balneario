#[cfg(test)]
mod tests {
    use balneario_app::domain::cuentas::{Cuenta, EstadoCuenta};
    use balneario_app::domain::errors::DomainError;
    use balneario_app::domain::pagos::{EstadoPago, MedioPago, Pago};

    #[test]
    fn test_creacion_cuenta_y_saldo_inicial() {
        let cuenta = Cuenta::new(
            1,
            "CTA-20261027-0001".to_string(),
            "carpa-12".to_string(),
            "Carpa 12".to_string(),
            8500.0,
            "cajero_test".to_string(),
            "2026-10-27T12:00:00Z".to_string(),
        ).expect("Debe crear la cuenta exitosamente");

        assert_eq!(cuenta.estado, EstadoCuenta::Abierta);
        assert_eq!(cuenta.total, 8500.0);
        assert_eq!(cuenta.saldo_pendiente, 8500.0);
        assert_eq!(cuenta.ubicacion_id, "carpa-12");
    }

    #[test]
    fn test_rechaza_cuenta_con_total_invalido() {
        let err = Cuenta::new(
            2,
            "CTA-0002".to_string(),
            "mesa-01".to_string(),
            "Mesa 1".to_string(),
            0.0,
            "cajero_test".to_string(),
            "2026-10-27T12:00:00Z".to_string(),
        ).unwrap_err();

        assert!(matches!(err, DomainError::Validacion(_)));
    }

    #[test]
    fn test_calculo_vuelto_efectivo_y_deduccion_saldo() {
        let mut cuenta = Cuenta::new(
            3,
            "CTA-0003".to_string(),
            "carpa-12".to_string(),
            "Carpa 12".to_string(),
            8500.0,
            "cajero_test".to_string(),
            "2026-10-27T12:00:00Z".to_string(),
        ).unwrap();

        // Pago en efectivo entregando $10.000 para pagar $5.000 -> Vuelto: $5.000
        let pago1 = Pago::new(
            101,
            cuenta.id,
            MedioPago::Efectivo,
            5000.0,
            Some(10000.0),
            None,
            "cajero_test".to_string(),
            "2026-10-27T12:05:00Z".to_string(),
            cuenta.saldo_pendiente,
        ).expect("Pago válido");

        assert_eq!(pago1.vuelto, Some(5000.0));
        assert_eq!(pago1.monto, 5000.0);

        // Recalcular saldo de la cuenta
        cuenta.recalcular_saldo(&[pago1.clone()]);
        assert_eq!(cuenta.saldo_pendiente, 3500.0);
        assert_eq!(cuenta.estado, EstadoCuenta::Abierta);

        // Pago 2 con Débito por el saldo restante ($3.500)
        let pago2 = Pago::new(
            102,
            cuenta.id,
            MedioPago::TarjetaDebito,
            3500.0,
            None,
            Some("CUPON-9988".to_string()),
            "cajero_test".to_string(),
            "2026-10-27T12:10:00Z".to_string(),
            cuenta.saldo_pendiente,
        ).expect("Pago 2 válido");

        cuenta.recalcular_saldo(&[pago1, pago2]);
        assert_eq!(cuenta.saldo_pendiente, 0.0);
        assert_eq!(cuenta.estado, EstadoCuenta::Pagada);
    }

    #[test]
    fn test_rechaza_pago_excedente_y_monto_negativo() {
        let saldo_actual = 5000.0;

        // Monto cero o negativo
        let err_cero = Pago::new(
            103,
            1,
            MedioPago::Efectivo,
            0.0,
            None,
            None,
            "cajero_test".to_string(),
            "2026-10-27T12:00:00Z".to_string(),
            saldo_actual,
        ).unwrap_err();
        assert_eq!(err_cero, DomainError::MontoInvalido);

        // Monto excede saldo
        let err_excede = Pago::new(
            104,
            1,
            MedioPago::TarjetaCredito,
            6000.0,
            None,
            None,
            "cajero_test".to_string(),
            "2026-10-27T12:00:00Z".to_string(),
            saldo_actual,
        ).unwrap_err();
        assert_eq!(err_excede, DomainError::MontoExcedeSaldo);
    }

    #[test]
    fn test_algoritmo_division_cuenta_con_residuo() {
        // $10.000 dividido en 3 partes
        let cuotas = Cuenta::calcular_division(10000.0, 3).expect("División válida");
        assert_eq!(cuotas.len(), 3);
        assert_eq!(cuotas[0], 3333.33);
        assert_eq!(cuotas[1], 3333.33);
        assert_eq!(cuotas[2], 3333.34);
        let suma: f64 = cuotas.iter().sum();
        assert!((suma - 10000.0).abs() < 0.001);

        // $12.000 dividido en 3 partes exactas
        let cuotas_exactas = Cuenta::calcular_division(12000.0, 3).expect("División exacta");
        assert_eq!(cuotas_exactas, vec![4000.0, 4000.0, 4000.0]);
    }

    #[test]
    fn test_anulacion_pago_restaura_saldo() {
        let mut cuenta = Cuenta::new(
            4,
            "CTA-0004".to_string(),
            "sombrilla-04".to_string(),
            "Sombrilla 4".to_string(),
            5000.0,
            "cajero_test".to_string(),
            "2026-10-27T12:00:00Z".to_string(),
        ).unwrap();

        let mut pago = Pago::new(
            105,
            cuenta.id,
            MedioPago::Transferencia,
            5000.0,
            None,
            Some("TRANSF-12345".to_string()),
            "cajero_test".to_string(),
            "2026-10-27T12:05:00Z".to_string(),
            cuenta.saldo_pendiente,
        ).unwrap();

        cuenta.recalcular_saldo(&[pago.clone()]);
        assert_eq!(cuenta.saldo_pendiente, 0.0);
        assert_eq!(cuenta.estado, EstadoCuenta::Pagada);

        // Anulación del pago
        pago.anular("Error en acreditación bancaria", "encargado_test", "2026-10-27T12:15:00Z")
            .expect("Debe anular el pago");
        assert_eq!(pago.estado, EstadoPago::Cancelado);

        cuenta.recalcular_saldo(&[pago]);
        assert_eq!(cuenta.saldo_pendiente, 5000.0);
        assert_eq!(cuenta.estado, EstadoCuenta::Abierta);
    }

    #[test]
    fn test_cierre_bloqueado_si_saldo_mayor_cero() {
        let cuenta_con_saldo = Cuenta::new(
            5,
            "CTA-0005".to_string(),
            "mesa-04".to_string(),
            "Mesa 4".to_string(),
            3000.0,
            "cajero_test".to_string(),
            "2026-10-27T12:00:00Z".to_string(),
        ).unwrap();

        let err = cuenta_con_saldo.validar_cierre().unwrap_err();
        assert_eq!(err, DomainError::SaldoPendiente);
    }
}

