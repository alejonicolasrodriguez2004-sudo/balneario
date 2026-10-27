// tests/storage_tests/test_turnos_repo.rs
// Pruebas de integración de repositorio para Turnos, Sangrías y Arqueo Ciego (Feature 004)

#[cfg(test)]
mod tests {
    use balneario_app::domain::entities::{Comanda, ItemComanda};
    use balneario_app::domain::errors::DomainError;
    use balneario_app::domain::pagos::MedioPago;
    use balneario_app::domain::turnos::EstadoTurno;
    use balneario_app::storage::comanda_repo::ComandaRepository;
    use balneario_app::storage::cuentas_repo::CuentasRepository;
    use balneario_app::storage::db::DatabaseManager;
    use balneario_app::storage::turnos_repo::TurnosRepository;

    #[test]
    fn test_ciclo_completo_turno_apertura_retiro_arqueo_y_exclusion() {
        let mut conn = DatabaseManager::conexion_memoria().expect("DB en memoria");

        // 1. Apertura de turno inicial con $25.000 de fondo
        let turno = {
            let mut repo = TurnosRepository::new(&mut conn);
            let t = repo
                .abrir_turno("cajero_playa_1", 25000.0)
                .expect("Apertura exitosa");
            assert_eq!(t.estado, EstadoTurno::Abierto);
            assert_eq!(t.fondo_inicial, 25000.0);
            assert_eq!(t.operador_apertura, "cajero_playa_1");
            t
        };

        // 2. Intento de abrir un segundo turno simultáneo (debe ser rechazado por FR-002)
        {
            let mut repo = TurnosRepository::new(&mut conn);
            let err_duplicado = repo.abrir_turno("cajero_playa_2", 10000.0).unwrap_err();
            assert_eq!(err_duplicado, DomainError::TurnoYaAbierto);
        }

        // 3. Simular una venta y cobro en efectivo vinculados al turno activo
        {
            let mut comanda_repo = ComandaRepository::new(&mut conn);
            let mut c = Comanda::nueva(
                "CMD-TUR-01".to_string(),
                "carpa-01".to_string(),
                "Carpa 1".to_string(),
                "mozo_1".to_string(),
                None,
            )
            .unwrap();
            c.agregar_item(
                ItemComanda::nuevo(
                    "licuado-frutilla".to_string(),
                    "Licuado".to_string(),
                    2,
                    2500.0,
                    None,
                )
                .unwrap(),
            )
            .unwrap();
            comanda_repo.crear_comanda(&mut c).unwrap();

            let mut cuentas_repo = CuentasRepository::new(&mut conn);
            let cta = cuentas_repo.abrir_cuenta("carpa-01", "cajero_playa_1").unwrap();
            cuentas_repo
                .registrar_pago(
                    cta.cuenta.id,
                    MedioPago::Efectivo,
                    5000.0,
                    Some(10000.0),
                    None,
                    "cajero_playa_1",
                    "tok_pago_1",
                )
                .unwrap();
        }

        // 4. Verificar efectivo en gaveta: Fondo $25.000 + Venta $5.000 = $30.000
        {
            let mut repo = TurnosRepository::new(&mut conn);
            let disponible = repo
                .calcular_efectivo_en_gaveta(turno.id)
                .expect("Cálculo disponible");
            assert_eq!(disponible, 30000.0);

            // 5. Registrar sangría / retiro parcial de $15.000
            let retiro = repo
                .registrar_retiro(
                    turno.id,
                    15000.0,
                    "cajero_playa_1",
                    "tesorero_luis",
                    "Alivio seguro de gaveta",
                )
                .expect("Retiro debe prosperar");
            assert_eq!(retiro.monto, 15000.0);

            // El saldo en gaveta ahora debe ser $15.000
            let nuevo_disponible = repo.calcular_efectivo_en_gaveta(turno.id).unwrap();
            assert_eq!(nuevo_disponible, 15000.0);

            // Intentar retirar $20.000 cuando quedan $15.000 debe fallar
            let err_insuficiente = repo
                .registrar_retiro(
                    turno.id,
                    20000.0,
                    "cajero_playa_1",
                    "tesorero_luis",
                    "Segundo retiro excesivo",
                )
                .unwrap_err();
            assert_eq!(err_insuficiente, DomainError::SaldoInsuficienteEnGaveta);
        }

        // 6. Cierre de turno con arqueo ciego:
        // Esperado en efectivo: $15.000
        // Declaramos a ciegas $15.000 (arqueo exacto)
        {
            let mut repo = TurnosRepository::new(&mut conn);
            let (turno_cerrado, arqueo) = repo
                .cerrar_turno_arqueo_ciego(
                    turno.id,
                    "supervisor_carlos",
                    15000.0,
                    0.0,
                    0.0,
                    0.0,
                    None,
                    Some("Cierre normal sin desvíos".to_string()),
                )
                .expect("Cierre exitoso");

            assert_eq!(turno_cerrado.estado, EstadoTurno::Cerrado);
            assert_eq!(turno_cerrado.operador_cierre.as_deref(), Some("supervisor_carlos"));
            assert_eq!(arqueo.esperado_efectivo, 15000.0);
            assert_eq!(arqueo.declarado_efectivo, 15000.0);
            assert_eq!(arqueo.diferencia_efectivo, 0.0);

            // 7. Verificar que ahora no hay turno abierto
            let activo = repo.obtener_turno_activo().unwrap();
            assert!(activo.is_none());

            // 8. Intentar operar sobre el turno cerrado debe fallar
            let err_sobre_cerrado = repo
                .registrar_retiro(
                    turno.id,
                    1000.0,
                    "cajero_playa_1",
                    "alguien",
                    "Intento tardío",
                )
                .unwrap_err();
            assert_eq!(err_sobre_cerrado, DomainError::TurnoYaCerrado);

            // 9. Verificar detalle completo y ticket
            let detalle = repo.obtener_detalle_turno(turno.id).unwrap();
            assert_eq!(detalle.retiros.len(), 1);
            assert!(detalle.arqueo.is_some());
            assert_eq!(detalle.resumen_medios_pago.efectivo, 5000.0);
            assert_eq!(detalle.resumen_medios_pago.total, 5000.0);

            let historial = repo.listar_historial_turnos(Some(10)).unwrap();
            assert_eq!(historial.len(), 1);
            assert_eq!(historial[0].id, turno.id);
        }
    }
}
