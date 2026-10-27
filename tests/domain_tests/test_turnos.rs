// tests/domain_tests/test_turnos.rs
// Pruebas unitarias de dominio para Turnos de Caja, Arqueo Ciego y Sangrías (Feature 004)

#[cfg(test)]
mod tests {
    use balneario_app::domain::errors::DomainError;
    use balneario_app::domain::turnos::{
        generar_ticket_80mm, ArqueoCierre, DetalleTurnoCompleto, EstadoTurno,
        ResumenMediosPagoTurno, RetiroCaja, TurnoCaja,
    };

    #[test]
    fn test_apertura_turno_valida() {
        let turno = TurnoCaja::abrir(
            "TUR-20261027-0001".to_string(),
            "cajero_playa_1".to_string(),
            25000.0,
            "2026-10-27T08:00:00Z".to_string(),
        )
        .expect("Debe abrir el turno exitosamente");

        assert_eq!(turno.codigo_visible, "TUR-20261027-0001");
        assert_eq!(turno.operador_apertura, "cajero_playa_1");
        assert_eq!(turno.fondo_inicial, 25000.0);
        assert_eq!(turno.estado, EstadoTurno::Abierto);
        assert!(turno.operador_cierre.is_none());
        assert!(turno.fecha_cierre.is_none());
    }

    #[test]
    fn test_rechaza_apertura_con_fondo_negativo() {
        let err = TurnoCaja::abrir(
            "TUR-0002".to_string(),
            "cajero_test".to_string(),
            -500.0,
            "2026-10-27T08:00:00Z".to_string(),
        )
        .unwrap_err();

        assert_eq!(err, DomainError::FondoInicialInvalido);
    }

    #[test]
    fn test_rechaza_apertura_sin_operador() {
        let err = TurnoCaja::abrir(
            "TUR-0003".to_string(),
            "   ".to_string(),
            10000.0,
            "2026-10-27T08:00:00Z".to_string(),
        )
        .unwrap_err();

        assert!(matches!(err, DomainError::Validacion(_)));
    }

    #[test]
    fn test_cierre_turno_sella_estado() {
        let mut turno = TurnoCaja::abrir(
            "TUR-0004".to_string(),
            "cajero_test".to_string(),
            15000.0,
            "2026-10-27T08:00:00Z".to_string(),
        )
        .unwrap();

        assert_eq!(turno.estado, EstadoTurno::Abierto);

        turno
            .cerrar("supervisor_ana", Some("Cierre normal".to_string()), "2026-10-27T16:00:00Z")
            .expect("Debe cerrar el turno");

        assert_eq!(turno.estado, EstadoTurno::Cerrado);
        assert_eq!(turno.operador_cierre.as_deref(), Some("supervisor_ana"));
        assert_eq!(turno.fecha_cierre.as_deref(), Some("2026-10-27T16:00:00Z"));
        assert_eq!(turno.observaciones_cierre.as_deref(), Some("Cierre normal"));

        // Intentar cerrar nuevamente debe fallar
        let err = turno.cerrar("otro", None, "2026-10-27T17:00:00Z").unwrap_err();
        assert_eq!(err, DomainError::TurnoYaCerrado);
    }

    #[test]
    fn test_retiro_parcial_exitoso_y_bloqueo_por_saldo_insuficiente() {
        let turno_id = 1;
        let efectivo_disponible = 80000.0;

        // Retiro válido de $50.000 con $80.000 disponible
        let retiro = RetiroCaja::nuevo(
            turno_id,
            50000.0,
            "cajero_1",
            "tesorero_luis",
            "Traslado seguro por límite de gaveta",
            efectivo_disponible,
            "2026-10-27T12:30:00Z".to_string(),
        )
        .expect("Retiro válido debe prosperar");

        assert_eq!(retiro.monto, 50000.0);
        assert_eq!(retiro.receptor, "tesorero_luis");
        assert_eq!(retiro.motivo, "Traslado seguro por límite de gaveta");

        // Intento de retirar más del disponible restante (ej. $40.000 cuando quedan $30.000)
        let saldo_restante = efectivo_disponible - retiro.monto; // 30000.0
        let err = RetiroCaja::nuevo(
            turno_id,
            40000.0,
            "cajero_1",
            "tesorero_luis",
            "Segundo traslado",
            saldo_restante,
            "2026-10-27T13:00:00Z".to_string(),
        )
        .unwrap_err();

        assert_eq!(err, DomainError::SaldoInsuficienteEnGaveta);
    }

    #[test]
    fn test_retiro_rechaza_motivo_corto() {
        let err = RetiroCaja::nuevo(
            1,
            5000.0,
            "cajero_1",
            "luis",
            "ab", // Menor a 4 caracteres
            10000.0,
            "2026-10-27T12:00:00Z".to_string(),
        )
        .unwrap_err();

        assert_eq!(err, DomainError::MotivoRequerido);
    }

    #[test]
    fn test_arqueo_ciego_sin_diferencias() {
        let arqueo = ArqueoCierre::calcular(
            1,
            25000.0, // Esperado efectivo: $25.000
            25000.0, // Declarado efectivo: $25.000
            15000.0, // Esperado débito
            15000.0, // Declarado débito
            10000.0, // Esperado crédito
            10000.0, // Declarado crédito
            5000.0,  // Esperado transferencia
            5000.0,  // Declarado transferencia
            None,
            "2026-10-27T18:00:00Z".to_string(),
        )
        .expect("Arqueo exacto debe calcularse sin error");

        assert_eq!(arqueo.diferencia_efectivo, 0.0);
        assert_eq!(arqueo.diferencia_debito, 0.0);
        assert_eq!(arqueo.diferencia_credito, 0.0);
        assert_eq!(arqueo.diferencia_transferencia, 0.0);
        assert_eq!(arqueo.diferencia_total, 0.0);
        assert!(arqueo.justificacion.is_none());
    }

    #[test]
    fn test_arqueo_ciego_con_tolerancia_menor_mil_pesos() {
        // Desvío de -$500 (menor a $1.000): no requiere justificación obligatoria
        let arqueo = ArqueoCierre::calcular(
            1,
            25000.0, // Esperado efectivo
            24500.0, // Declarado: $500 faltante
            10000.0,
            10000.0,
            5000.0,
            5000.0,
            0.0,
            0.0,
            None,
            "2026-10-27T18:00:00Z".to_string(),
        )
        .expect("Desvío de $500 no requiere justificación estricta");

        assert_eq!(arqueo.diferencia_efectivo, -500.0);
        assert_eq!(arqueo.diferencia_total, -500.0);
    }

    #[test]
    fn test_arqueo_ciego_exige_justificacion_si_desvio_mayor_mil_pesos() {
        // Desvío de -$1.500 sin justificación debe fallar (FR-008)
        let err = ArqueoCierre::calcular(
            1,
            25000.0,
            23500.0, // Faltante de $1.500
            10000.0,
            10000.0,
            5000.0,
            5000.0,
            0.0,
            0.0,
            None,
            "2026-10-27T18:00:00Z".to_string(),
        )
        .unwrap_err();

        assert_eq!(err, DomainError::JustificacionRequerida);

        // Desvío con justificación válida debe prosperar
        let arqueo = ArqueoCierre::calcular(
            1,
            25000.0,
            23500.0,
            10000.0,
            10000.0,
            5000.0,
            5000.0,
            0.0,
            0.0,
            Some("Billete falso retenido por el cajero y entregado a gerencia".to_string()),
            "2026-10-27T18:00:00Z".to_string(),
        )
        .expect("Con justificación debe ser aceptado");

        assert_eq!(arqueo.diferencia_efectivo, -1500.0);
        assert!(arqueo.justificacion.is_some());
    }

    #[test]
    fn test_generar_ticket_80mm_formato() {
        let detalle = DetalleTurnoCompleto {
            turno: TurnoCaja {
                id: 1,
                codigo_visible: "TUR-20261027-0001".to_string(),
                operador_apertura: "cajero_playa".to_string(),
                fondo_inicial: 25000.0,
                fecha_apertura: "2026-10-27T08:00:00Z".to_string(),
                estado: EstadoTurno::Cerrado,
                operador_cierre: Some("supervisor_luis".to_string()),
                fecha_cierre: Some("2026-10-27T16:00:00Z".to_string()),
                observaciones_cierre: Some("Turno mañana sin novedades".to_string()),
            },
            arqueo: Some(ArqueoCierre {
                id: 1,
                turno_id: 1,
                esperado_efectivo: 75000.0,
                declarado_efectivo: 75000.0,
                diferencia_efectivo: 0.0,
                esperado_debito: 30000.0,
                declarado_debito: 30000.0,
                diferencia_debito: 0.0,
                esperado_credito: 20000.0,
                declarado_credito: 20000.0,
                diferencia_credito: 0.0,
                esperado_transferencia: 10000.0,
                declarado_transferencia: 10000.0,
                diferencia_transferencia: 0.0,
                diferencia_total: 0.0,
                justificacion: None,
                creado_en: "2026-10-27T16:00:00Z".to_string(),
            }),
            retiros: vec![RetiroCaja {
                id: 1,
                turno_id: 1,
                monto: 20000.0,
                operador: "cajero_playa".to_string(),
                receptor: "tesorero_ana".to_string(),
                motivo: "Alivio de gaveta por seguridad".to_string(),
                creado_en: "2026-10-27T12:00:00Z".to_string(),
            }],
            resumen_medios_pago: ResumenMediosPagoTurno {
                efectivo: 70000.0,
                debito: 30000.0,
                credito: 20000.0,
                transferencia: 10000.0,
                total: 130000.0,
            },
        };

        let ticket = generar_ticket_80mm(&detalle);

        assert!(ticket.contains("BALNEARIO - CIERRE DE TURNO"));
        assert!(ticket.contains("TUR-20261027-0001"));
        assert!(ticket.contains("Fondo Inicial:"));
        assert!(ticket.contains("25000.00"));
        assert!(ticket.contains("Retiros / Sangrías (1):"));
        assert!(ticket.contains("20000.00"));
        assert!(ticket.contains("EXACTO (0.00)"));
        assert!(ticket.contains("Firma Cajero:"));
    }
}
