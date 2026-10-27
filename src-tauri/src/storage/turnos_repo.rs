// src-tauri/src/storage/turnos_repo.rs
// Repositorio transaccional de Turnos de Caja, Arqueo Ciego y Sangrías (Feature 004)

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use std::str::FromStr;

use crate::domain::errors::DomainError;
use crate::domain::turnos::{
    ArqueoCierre, DetalleTurnoCompleto, EstadoTurno, EstadoTurnoActual, ResumenMediosPagoTurno,
    RetiroCaja, TurnoCaja,
};

pub struct TurnosRepository<'a> {
    conn: &'a mut Connection,
}

impl<'a> TurnosRepository<'a> {
    pub fn new(conn: &'a mut Connection) -> Self {
        Self { conn }
    }

    /// Abre un nuevo turno de caja garantizando exclusión mutua de único turno abierto
    pub fn abrir_turno(
        &mut self,
        operador: &str,
        fondo_inicial: f64,
    ) -> Result<TurnoCaja, DomainError> {
        let tx = self.conn.transaction()?;

        // Verificar si ya existe un turno abierto (FR-002)
        let turno_abierto_existe: bool = tx.query_row(
            "SELECT COUNT(*) > 0 FROM turnos_caja WHERE estado = 'Abierto';",
            [],
            |r| r.get(0),
        )?;

        if turno_abierto_existe {
            return Err(DomainError::TurnoYaAbierto);
        }

        // Generar correlativo para el código visible
        let hoy = Utc::now().format("%Y%m%d").to_string();
        let correlativo: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM turnos_caja WHERE fecha_apertura LIKE ?1 || '%';",
                [&hoy],
                |r| r.get(0),
            )
            .unwrap_or(0);

        let codigo_visible = format!("TUR-{}-{:04}", hoy, correlativo + 1);
        let timestamp = Utc::now().to_rfc3339();

        let turno_dominio =
            TurnoCaja::abrir(codigo_visible.clone(), operador.to_string(), fondo_inicial, timestamp.clone())?;

        let res = tx.execute(
            "INSERT INTO turnos_caja (
                codigo_visible, operador_apertura, fondo_inicial, fecha_apertura, estado
            ) VALUES (?1, ?2, ?3, ?4, 'Abierto');",
            params![
                turno_dominio.codigo_visible,
                turno_dominio.operador_apertura,
                turno_dominio.fondo_inicial,
                turno_dominio.fecha_apertura,
            ],
        );

        if let Err(rusqlite::Error::SqliteFailure(ref f, _)) = res {
            // Código 19 o 2067 es SQLite constraint violation (por ejemplo, el índice único idx_un_solo_turno_abierto)
            if f.code == rusqlite::ErrorCode::ConstraintViolation {
                return Err(DomainError::TurnoYaAbierto);
            }
        }
        res?;

        let id = tx.last_insert_rowid();
        tx.commit()?;

        Ok(TurnoCaja {
            id,
            codigo_visible: turno_dominio.codigo_visible,
            operador_apertura: turno_dominio.operador_apertura,
            fondo_inicial: turno_dominio.fondo_inicial,
            fecha_apertura: turno_dominio.fecha_apertura,
            estado: EstadoTurno::Abierto,
            operador_cierre: None,
            fecha_cierre: None,
            observaciones_cierre: None,
        })
    }

    /// Obtiene el turno actualmente activo (si existe)
    pub fn obtener_turno_activo(&mut self) -> Result<Option<TurnoCaja>, DomainError> {
        let res = self.conn.query_row(
            "SELECT id, codigo_visible, operador_apertura, fondo_inicial, fecha_apertura,
                    estado, operador_cierre, fecha_cierre, observaciones_cierre
             FROM turnos_caja
             WHERE estado = 'Abierto'
             LIMIT 1;",
            [],
            |r| {
                let estado_str: String = r.get(5)?;
                Ok(TurnoCaja {
                    id: r.get(0)?,
                    codigo_visible: r.get(1)?,
                    operador_apertura: r.get(2)?,
                    fondo_inicial: r.get(3)?,
                    fecha_apertura: r.get(4)?,
                    estado: EstadoTurno::from_str(&estado_str)
                        .map_err(|_| rusqlite::Error::InvalidQuery)?,
                    operador_cierre: r.get(6)?,
                    fecha_cierre: r.get(7)?,
                    observaciones_cierre: r.get(8)?,
                })
            },
        ).optional()?;

        Ok(res)
    }

    /// Calcula el efectivo real disponible en la gaveta física para un turno dado
    pub fn calcular_efectivo_en_gaveta(&mut self, turno_id: i64) -> Result<f64, DomainError> {
        let fondo_inicial: f64 = self
            .conn
            .query_row(
                "SELECT fondo_inicial FROM turnos_caja WHERE id = ?1;",
                [turno_id],
                |r| r.get(0),
            )
            .map_err(|_| DomainError::NoHayTurnoAbierto)?;

        let cobros_efectivo: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(monto), 0.0)
             FROM pagos
             WHERE turno_id = ?1 AND medio_pago = 'Efectivo' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let retiros: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(monto), 0.0)
             FROM retiros_caja
             WHERE turno_id = ?1;",
            [turno_id],
            |r| r.get(0),
        )?;

        let disponible = fondo_inicial + cobros_efectivo - retiros;
        Ok((disponible * 100.0).round() / 100.0)
    }

    /// Obtiene un resumen completo del estado operacional del turno actual
    pub fn obtener_estado_turno_actual(&mut self) -> Result<EstadoTurnoActual, DomainError> {
        let turno_opt = self.obtener_turno_activo()?;
        let cuentas_pendientes: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM cuentas WHERE estado = 'Abierta';",
            [],
            |r| r.get(0),
        )?;

        let turno = match turno_opt {
            Some(t) => t,
            None => {
                return Ok(EstadoTurnoActual {
                    turno_abierto: None,
                    efectivo_en_gaveta: 0.0,
                    total_cobrado_efectivo: 0.0,
                    total_cobrado_debito: 0.0,
                    total_cobrado_credito: 0.0,
                    total_cobrado_transferencia: 0.0,
                    total_recaudado: 0.0,
                    total_retiros: 0.0,
                    cantidad_cobros: 0,
                    cantidad_retiros: 0,
                    cuentas_abiertas_pendientes: cuentas_pendientes,
                });
            }
        };

        let turno_id = turno.id;
        let efectivo_en_gaveta = self.calcular_efectivo_en_gaveta(turno_id)?;

        let cobros_efectivo: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE turno_id = ?1 AND medio_pago = 'Efectivo' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let cobros_debito: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE turno_id = ?1 AND medio_pago = 'Tarjeta Débito' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let cobros_credito: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE turno_id = ?1 AND medio_pago = 'Tarjeta Crédito' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let cobros_transferencia: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE turno_id = ?1 AND medio_pago = 'Transferencia' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let retiros: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM retiros_caja WHERE turno_id = ?1;",
            [turno_id],
            |r| r.get(0),
        )?;

        let cantidad_cobros: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM pagos WHERE turno_id = ?1 AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let cantidad_retiros: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM retiros_caja WHERE turno_id = ?1;",
            [turno_id],
            |r| r.get(0),
        )?;

        let total_recaudado =
            ((cobros_efectivo + cobros_debito + cobros_credito + cobros_transferencia) * 100.0)
                .round()
                / 100.0;

        Ok(EstadoTurnoActual {
            turno_abierto: Some(turno),
            efectivo_en_gaveta,
            total_cobrado_efectivo: (cobros_efectivo * 100.0).round() / 100.0,
            total_cobrado_debito: (cobros_debito * 100.0).round() / 100.0,
            total_cobrado_credito: (cobros_credito * 100.0).round() / 100.0,
            total_cobrado_transferencia: (cobros_transferencia * 100.0).round() / 100.0,
            total_recaudado,
            total_retiros: (retiros * 100.0).round() / 100.0,
            cantidad_cobros,
            cantidad_retiros,
            cuentas_abiertas_pendientes: cuentas_pendientes,
        })
    }

    /// Registra una sangría / retiro parcial de efectivo validando saldo disponible en gaveta
    pub fn registrar_retiro(
        &mut self,
        turno_id: i64,
        monto: f64,
        operador: &str,
        receptor: &str,
        motivo: &str,
    ) -> Result<RetiroCaja, DomainError> {
        let tx = self.conn.transaction()?;

        // Verificar estado del turno
        let estado_str: String = tx
            .query_row(
                "SELECT estado FROM turnos_caja WHERE id = ?1;",
                [turno_id],
                |r| r.get(0),
            )
            .map_err(|_| DomainError::NoHayTurnoAbierto)?;

        if estado_str != "Abierto" {
            return Err(DomainError::TurnoYaCerrado);
        }

        // Calcular efectivo disponible en gaveta dentro de la transacción
        let fondo_inicial: f64 = tx.query_row(
            "SELECT fondo_inicial FROM turnos_caja WHERE id = ?1;",
            [turno_id],
            |r| r.get(0),
        )?;

        let cobros_efectivo: f64 = tx.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE turno_id = ?1 AND medio_pago = 'Efectivo' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let retiros_acumulados: f64 = tx.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM retiros_caja WHERE turno_id = ?1;",
            [turno_id],
            |r| r.get(0),
        )?;

        let efectivo_disponible = fondo_inicial + cobros_efectivo - retiros_acumulados;
        let timestamp = Utc::now().to_rfc3339();

        let retiro_dominio = RetiroCaja::nuevo(
            turno_id,
            monto,
            operador,
            receptor,
            motivo,
            efectivo_disponible,
            timestamp.clone(),
        )?;

        tx.execute(
            "INSERT INTO retiros_caja (
                turno_id, monto, operador, receptor, motivo, creado_en
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6);",
            params![
                turno_id,
                retiro_dominio.monto,
                retiro_dominio.operador,
                retiro_dominio.receptor,
                retiro_dominio.motivo,
                retiro_dominio.creado_en,
            ],
        )?;

        let id = tx.last_insert_rowid();
        tx.commit()?;

        Ok(RetiroCaja {
            id,
            turno_id,
            monto: retiro_dominio.monto,
            operador: retiro_dominio.operador,
            receptor: retiro_dominio.receptor,
            motivo: retiro_dominio.motivo,
            creado_en: retiro_dominio.creado_en,
        })
    }

    /// Cierra el turno mediante arqueo ciego, sellando transaccionalmente el turno
    pub fn cerrar_turno_arqueo_ciego(
        &mut self,
        turno_id: i64,
        operador_cierre: &str,
        declarado_efectivo: f64,
        declarado_debito: f64,
        declarado_credito: f64,
        declarado_transferencia: f64,
        justificacion: Option<String>,
        observaciones: Option<String>,
    ) -> Result<(TurnoCaja, ArqueoCierre), DomainError> {
        let tx = self.conn.transaction()?;

        // Verificar existencia y estado del turno
        let (codigo_visible, operador_apertura, fondo_inicial, fecha_apertura, estado_str): (
            String,
            String,
            f64,
            String,
            String,
        ) = tx
            .query_row(
                "SELECT codigo_visible, operador_apertura, fondo_inicial, fecha_apertura, estado
                 FROM turnos_caja WHERE id = ?1;",
                [turno_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
            )
            .map_err(|_| DomainError::NoHayTurnoAbierto)?;

        if estado_str != "Abierto" {
            return Err(DomainError::TurnoYaCerrado);
        }

        // Calcular valores teóricos esperados
        let cobros_efectivo: f64 = tx.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE turno_id = ?1 AND medio_pago = 'Efectivo' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let cobros_debito: f64 = tx.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE turno_id = ?1 AND medio_pago = 'Tarjeta Débito' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let cobros_credito: f64 = tx.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE turno_id = ?1 AND medio_pago = 'Tarjeta Crédito' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let cobros_transferencia: f64 = tx.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE turno_id = ?1 AND medio_pago = 'Transferencia' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let retiros: f64 = tx.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM retiros_caja WHERE turno_id = ?1;",
            [turno_id],
            |r| r.get(0),
        )?;

        let esperado_efectivo = fondo_inicial + cobros_efectivo - retiros;
        let timestamp = Utc::now().to_rfc3339();

        let arqueo_dominio = ArqueoCierre::calcular(
            turno_id,
            esperado_efectivo,
            declarado_efectivo,
            cobros_debito,
            declarado_debito,
            cobros_credito,
            declarado_credito,
            cobros_transferencia,
            declarado_transferencia,
            justificacion,
            timestamp.clone(),
        )?;

        let observaciones_limpias = observaciones
            .map(|o| o.trim().to_string())
            .filter(|o| !o.is_empty());

        // Actualizar turno a Cerrado
        tx.execute(
            "UPDATE turnos_caja
             SET estado = 'Cerrado', operador_cierre = ?1, fecha_cierre = ?2, observaciones_cierre = ?3
             WHERE id = ?4;",
            params![
                operador_cierre.trim(),
                timestamp,
                observaciones_limpias,
                turno_id,
            ],
        )?;

        // Insertar arqueo de cierre
        tx.execute(
            "INSERT INTO arqueos_cierre (
                turno_id, esperado_efectivo, declarado_efectivo, diferencia_efectivo,
                esperado_debito, declarado_debito, diferencia_debito,
                esperado_credito, declarado_credito, diferencia_credito,
                esperado_transferencia, declarado_transferencia, diferencia_transferencia,
                diferencia_total, justificacion, creado_en
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16);",
            params![
                turno_id,
                arqueo_dominio.esperado_efectivo,
                arqueo_dominio.declarado_efectivo,
                arqueo_dominio.diferencia_efectivo,
                arqueo_dominio.esperado_debito,
                arqueo_dominio.declarado_debito,
                arqueo_dominio.diferencia_debito,
                arqueo_dominio.esperado_credito,
                arqueo_dominio.declarado_credito,
                arqueo_dominio.diferencia_credito,
                arqueo_dominio.esperado_transferencia,
                arqueo_dominio.declarado_transferencia,
                arqueo_dominio.diferencia_transferencia,
                arqueo_dominio.diferencia_total,
                arqueo_dominio.justificacion,
                arqueo_dominio.creado_en,
            ],
        )?;

        let arqueo_id = tx.last_insert_rowid();
        tx.commit()?;

        let mut arqueo_resultado = arqueo_dominio;
        arqueo_resultado.id = arqueo_id;

        let turno_resultado = TurnoCaja {
            id: turno_id,
            codigo_visible,
            operador_apertura,
            fondo_inicial,
            fecha_apertura,
            estado: EstadoTurno::Cerrado,
            operador_cierre: Some(operador_cierre.trim().to_string()),
            fecha_cierre: Some(timestamp),
            observaciones_cierre: observaciones_limpias,
        };

        Ok((turno_resultado, arqueo_resultado))
    }

    /// Lista el historial de turnos pasados ordenados cronológicamente descendente
    pub fn listar_historial_turnos(
        &mut self,
        limite: Option<i64>,
    ) -> Result<Vec<TurnoCaja>, DomainError> {
        let max_filas = limite.unwrap_or(50);
        let mut stmt = self.conn.prepare(
            "SELECT id, codigo_visible, operador_apertura, fondo_inicial, fecha_apertura,
                    estado, operador_cierre, fecha_cierre, observaciones_cierre
             FROM turnos_caja
             ORDER BY id DESC
             LIMIT ?1;",
        )?;

        let iter = stmt.query_map([max_filas], |r| {
            let estado_str: String = r.get(5)?;
            Ok(TurnoCaja {
                id: r.get(0)?,
                codigo_visible: r.get(1)?,
                operador_apertura: r.get(2)?,
                fondo_inicial: r.get(3)?,
                fecha_apertura: r.get(4)?,
                estado: EstadoTurno::from_str(&estado_str)
                    .map_err(|_| rusqlite::Error::InvalidQuery)?,
                operador_cierre: r.get(6)?,
                fecha_cierre: r.get(7)?,
                observaciones_cierre: r.get(8)?,
            })
        })?;

        let mut turnos = Vec::new();
        for t in iter {
            turnos.push(t?);
        }
        Ok(turnos)
    }

    /// Obtiene el detalle consolidado de un turno (Turno, Arqueo, Sangrías, Totales)
    pub fn obtener_detalle_turno(
        &mut self,
        turno_id: i64,
    ) -> Result<DetalleTurnoCompleto, DomainError> {
        // 1. Obtener datos del turno
        let turno = self
            .conn
            .query_row(
                "SELECT id, codigo_visible, operador_apertura, fondo_inicial, fecha_apertura,
                        estado, operador_cierre, fecha_cierre, observaciones_cierre
                 FROM turnos_caja
                 WHERE id = ?1;",
                [turno_id],
                |r| {
                    let estado_str: String = r.get(5)?;
                    Ok(TurnoCaja {
                        id: r.get(0)?,
                        codigo_visible: r.get(1)?,
                        operador_apertura: r.get(2)?,
                        fondo_inicial: r.get(3)?,
                        fecha_apertura: r.get(4)?,
                        estado: EstadoTurno::from_str(&estado_str)
                            .map_err(|_| rusqlite::Error::InvalidQuery)?,
                        operador_cierre: r.get(6)?,
                        fecha_cierre: r.get(7)?,
                        observaciones_cierre: r.get(8)?,
                    })
                },
            )
            .map_err(|_| DomainError::NoHayTurnoAbierto)?;

        // 2. Obtener arqueo si fue cerrado
        let arqueo = self
            .conn
            .query_row(
                "SELECT id, turno_id, esperado_efectivo, declarado_efectivo, diferencia_efectivo,
                        esperado_debito, declarado_debito, diferencia_debito,
                        esperado_credito, declarado_credito, diferencia_credito,
                        esperado_transferencia, declarado_transferencia, diferencia_transferencia,
                        diferencia_total, justificacion, creado_en
                 FROM arqueos_cierre
                 WHERE turno_id = ?1;",
                [turno_id],
                |r| {
                    Ok(ArqueoCierre {
                        id: r.get(0)?,
                        turno_id: r.get(1)?,
                        esperado_efectivo: r.get(2)?,
                        declarado_efectivo: r.get(3)?,
                        diferencia_efectivo: r.get(4)?,
                        esperado_debito: r.get(5)?,
                        declarado_debito: r.get(6)?,
                        diferencia_debito: r.get(7)?,
                        esperado_credito: r.get(8)?,
                        declarado_credito: r.get(9)?,
                        diferencia_credito: r.get(10)?,
                        esperado_transferencia: r.get(11)?,
                        declarado_transferencia: r.get(12)?,
                        diferencia_transferencia: r.get(13)?,
                        diferencia_total: r.get(14)?,
                        justificacion: r.get(15)?,
                        creado_en: r.get(16)?,
                    })
                },
            )
            .optional()?;

        // 3. Obtener retiros
        let mut stmt_retiros = self.conn.prepare(
            "SELECT id, turno_id, monto, operador, receptor, motivo, creado_en
             FROM retiros_caja
             WHERE turno_id = ?1
             ORDER BY id ASC;",
        )?;
        let retiros_iter = stmt_retiros.query_map([turno_id], |r| {
            Ok(RetiroCaja {
                id: r.get(0)?,
                turno_id: r.get(1)?,
                monto: r.get(2)?,
                operador: r.get(3)?,
                receptor: r.get(4)?,
                motivo: r.get(5)?,
                creado_en: r.get(6)?,
            })
        })?;

        let mut retiros = Vec::new();
        for ret in retiros_iter {
            retiros.push(ret?);
        }

        // 4. Calcular resumen de medios de cobro
        let cobros_efectivo: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE turno_id = ?1 AND medio_pago = 'Efectivo' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let cobros_debito: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE turno_id = ?1 AND medio_pago = 'Tarjeta Débito' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let cobros_credito: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE turno_id = ?1 AND medio_pago = 'Tarjeta Crédito' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let cobros_transferencia: f64 = self.conn.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE turno_id = ?1 AND medio_pago = 'Transferencia' AND estado = 'Activo';",
            [turno_id],
            |r| r.get(0),
        )?;

        let total = ((cobros_efectivo + cobros_debito + cobros_credito + cobros_transferencia)
            * 100.0)
            .round()
            / 100.0;

        let resumen = ResumenMediosPagoTurno {
            efectivo: (cobros_efectivo * 100.0).round() / 100.0,
            debito: (cobros_debito * 100.0).round() / 100.0,
            credito: (cobros_credito * 100.0).round() / 100.0,
            transferencia: (cobros_transferencia * 100.0).round() / 100.0,
            total,
        };

        Ok(DetalleTurnoCompleto {
            turno,
            arqueo,
            retiros,
            resumen_medios_pago: resumen,
        })
    }
}
