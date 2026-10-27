// src-tauri/src/storage/cuentas_repo.rs
// Repositorio transaccional de Cuentas, Pagos y Arqueo de Caja (Feature 002)

use chrono::Utc;
use rusqlite::{params, Connection};
use std::str::FromStr;

use crate::domain::cuentas::{ComandaEnCuenta, Cuenta, CuentaDetallada, EstadoCuenta};
use crate::domain::errors::DomainError;
use crate::domain::pagos::{EstadoPago, MedioPago, Pago, ResumenArqueo};

pub struct CuentasRepository<'a> {
    conn: &'a mut Connection,
}

impl<'a> CuentasRepository<'a> {
    pub fn new(conn: &'a mut Connection) -> Self {
        Self { conn }
    }

    /// Abre una nueva cuenta de liquidación consolidando las comandas activas de una ubicación
    pub fn abrir_cuenta(&mut self, ubicacion_id: &str, operador: &str) -> Result<CuentaDetallada, DomainError> {
        let tx = self.conn.transaction()?;

        // 1. Validar que la ubicación física exista y esté activa
        let ubicacion_nombre: String = tx
            .query_row(
                "SELECT nombre FROM ubicaciones_referencia WHERE id = ?1 AND activo = 1;",
                [ubicacion_id],
                |r| r.get(0),
            )
            .map_err(|_| DomainError::UbicacionNoEncontrada)?;

        // 2. Validar que no exista ya una cuenta abierta para esa ubicación
        let cuenta_existente: bool = tx.query_row(
            "SELECT COUNT(*) > 0 FROM cuentas WHERE ubicacion_id = ?1 AND estado = 'Abierta';",
            [ubicacion_id],
            |r| r.get(0),
        )?;
        if cuenta_existente {
            return Err(DomainError::CuentaYaAbierta);
        }

        // 3. Buscar comandas activas ('Abierta') de la ubicación no asociadas a cuentas activas
        let mut stmt = tx.prepare(
            "SELECT c.id, c.codigo_visible, c.total 
             FROM comandas c
             WHERE c.ubicacion_id = ?1 
               AND c.estado = 'Abierta'
               AND c.id NOT IN (
                   SELECT cc.comanda_id 
                   FROM cuenta_comandas cc
                   JOIN cuentas cu ON cc.cuenta_id = cu.id
                   WHERE cu.estado IN ('Abierta', 'Pagada', 'Cerrada')
               )
             ORDER BY c.id ASC;",
        )?;

        let comandas_iter = stmt.query_map([ubicacion_id], |row| {
            Ok(ComandaEnCuenta {
                comanda_id: row.get(0)?,
                codigo_visible: row.get(1)?,
                total: row.get(2)?,
            })
        })?;

        let mut comandas = Vec::new();
        let mut total_cuenta = 0.0;
        for c in comandas_iter {
            let item = c?;
            total_cuenta += item.total;
            comandas.push(item);
        }

        if comandas.is_empty() {
            return Err(DomainError::SinConsumosPendientes);
        }

        // 4. Generar código visible para la cuenta
        let hoy = Utc::now().format("%Y%m%d").to_string();
        let correlativo: i64 = tx
            .query_row(
                "SELECT COUNT(*) FROM cuentas WHERE creado_en LIKE ?1 || '%';",
                [&hoy],
                |r| r.get(0),
            )
            .unwrap_or(0);
        let codigo_visible = format!("CTA-{}-{:04}", hoy, correlativo + 1);
        let timestamp = Utc::now().to_rfc3339();

        // 5. Insertar cuenta
        tx.execute(
            "INSERT INTO cuentas (
                codigo_visible, ubicacion_id, ubicacion_nombre, estado, total,
                saldo_pendiente, creado_por, creado_en
            ) VALUES (?1, ?2, ?3, 'Abierta', ?4, ?4, ?5, ?6);",
            params![
                codigo_visible,
                ubicacion_id,
                ubicacion_nombre,
                total_cuenta,
                operador,
                timestamp,
            ],
        )?;

        let cuenta_id = tx.last_insert_rowid();

        // 6. Asociar cada comanda a la cuenta
        for comanda in &comandas {
            tx.execute(
                "INSERT INTO cuenta_comandas (cuenta_id, comanda_id, total_comanda, agregado_en)
                 VALUES (?1, ?2, ?3, ?4);",
                params![cuenta_id, comanda.comanda_id, comanda.total, timestamp],
            )?;
        }

        // 7. Auditoría
        tx.execute(
            "INSERT INTO auditoria_pagos (cuenta_id, tipo_evento, descripcion, usuario, timestamp)
             VALUES (?1, 'APERTURA_CUENTA', ?2, ?3, ?4);",
            params![
                cuenta_id,
                format!("Apertura de cuenta {} con {} comanda(s)", codigo_visible, comandas.len()),
                operador,
                timestamp,
            ],
        )?;

        tx.commit()?;

        Ok(CuentaDetallada {
            cuenta: Cuenta {
                id: cuenta_id,
                codigo_visible,
                ubicacion_id: ubicacion_id.to_string(),
                ubicacion_nombre,
                estado: EstadoCuenta::Abierta,
                total: total_cuenta,
                saldo_pendiente: total_cuenta,
                creado_por: operador.to_string(),
                creado_en: timestamp,
                cerrado_en: None,
                anulado_en: None,
                motivo_anulacion: None,
                anulado_por: None,
            },
            comandas_asociadas: comandas,
            pagos: Vec::new(),
        })
    }

    /// Obtiene una cuenta detallada por su ID con comandas y pagos asociados
    pub fn obtener_cuenta(&mut self, cuenta_id: i64) -> Result<CuentaDetallada, DomainError> {
        let cuenta = self.conn.query_row(
            "SELECT id, codigo_visible, ubicacion_id, ubicacion_nombre, estado, total,
                    saldo_pendiente, creado_por, creado_en, cerrado_en, anulado_en,
                    motivo_anulacion, anulado_por
             FROM cuentas WHERE id = ?1;",
            [cuenta_id],
            |r| {
                let estado_str: String = r.get(4)?;
                Ok(Cuenta {
                    id: r.get(0)?,
                    codigo_visible: r.get(1)?,
                    ubicacion_id: r.get(2)?,
                    ubicacion_nombre: r.get(3)?,
                    estado: EstadoCuenta::from_str(&estado_str).map_err(|_| rusqlite::Error::InvalidQuery)?,
                    total: r.get(5)?,
                    saldo_pendiente: r.get(6)?,
                    creado_por: r.get(7)?,
                    creado_en: r.get(8)?,
                    cerrado_en: r.get(9)?,
                    anulado_en: r.get(10)?,
                    motivo_anulacion: r.get(11)?,
                    anulado_por: r.get(12)?,
                })
            },
        ).map_err(|err| match err {
            rusqlite::Error::QueryReturnedNoRows => DomainError::CuentaNoEncontrada,
            _ => DomainError::ErrorAlmacenamiento(err.to_string()),
        })?;

        // Comandas asociadas
        let mut stmt_comandas = self.conn.prepare(
            "SELECT cc.comanda_id, c.codigo_visible, cc.total_comanda
             FROM cuenta_comandas cc
             JOIN comandas c ON cc.comanda_id = c.id
             WHERE cc.cuenta_id = ?1
             ORDER BY cc.id ASC;",
        )?;

        let comandas_iter = stmt_comandas.query_map([cuenta_id], |r| {
            Ok(ComandaEnCuenta {
                comanda_id: r.get(0)?,
                codigo_visible: r.get(1)?,
                total: r.get(2)?,
            })
        })?;
        let mut comandas = Vec::new();
        for c in comandas_iter {
            comandas.push(c?);
        }

        // Pagos asociados
        let mut stmt_pagos = self.conn.prepare(
            "SELECT id, cuenta_id, medio_pago, monto, monto_entregado, vuelto,
                    referencia_externa, estado, motivo_anulacion, cancelado_por,
                    cancelado_en, creado_por, creado_en
             FROM pagos
             WHERE cuenta_id = ?1
             ORDER BY id ASC;",
        )?;

        let pagos_iter = stmt_pagos.query_map([cuenta_id], |r| {
            let medio_str: String = r.get(2)?;
            let estado_str: String = r.get(7)?;
            Ok(Pago {
                id: r.get(0)?,
                cuenta_id: r.get(1)?,
                medio_pago: MedioPago::from_str(&medio_str).map_err(|_| rusqlite::Error::InvalidQuery)?,
                monto: r.get(3)?,
                monto_entregado: r.get(4)?,
                vuelto: r.get(5)?,
                referencia_externa: r.get(6)?,
                estado: EstadoPago::from_str(&estado_str).map_err(|_| rusqlite::Error::InvalidQuery)?,
                motivo_anulacion: r.get(8)?,
                cancelado_por: r.get(9)?,
                cancelado_en: r.get(10)?,
                creado_por: r.get(11)?,
                creado_en: r.get(12)?,
            })
        })?;
        let mut pagos = Vec::new();
        for p in pagos_iter {
            pagos.push(p?);
        }

        Ok(CuentaDetallada {
            cuenta,
            comandas_asociadas: comandas,
            pagos,
        })
    }

    /// Lista todas las cuentas abiertas y pagadas (para visualización activa de cobros)
    pub fn listar_cuentas_activas(&mut self) -> Result<Vec<Cuenta>, DomainError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, codigo_visible, ubicacion_id, ubicacion_nombre, estado, total,
                    saldo_pendiente, creado_por, creado_en, cerrado_en, anulado_en,
                    motivo_anulacion, anulado_por
             FROM cuentas
             WHERE estado IN ('Abierta', 'Pagada')
             ORDER BY id DESC;",
        )?;

        let iter = stmt.query_map([], |r| {
            let estado_str: String = r.get(4)?;
            Ok(Cuenta {
                id: r.get(0)?,
                codigo_visible: r.get(1)?,
                ubicacion_id: r.get(2)?,
                ubicacion_nombre: r.get(3)?,
                estado: EstadoCuenta::from_str(&estado_str).map_err(|_| rusqlite::Error::InvalidQuery)?,
                total: r.get(5)?,
                saldo_pendiente: r.get(6)?,
                creado_por: r.get(7)?,
                creado_en: r.get(8)?,
                cerrado_en: r.get(9)?,
                anulado_en: r.get(10)?,
                motivo_anulacion: r.get(11)?,
                anulado_por: r.get(12)?,
            })
        })?;

        let mut lista = Vec::new();
        for item in iter {
            lista.push(item?);
        }
        Ok(lista)
    }

    /// Registra un cobro transaccional deduciendo atómicamente el saldo de la cuenta
    pub fn registrar_pago(
        &mut self,
        cuenta_id: i64,
        medio_pago: MedioPago,
        monto: f64,
        monto_entregado: Option<f64>,
        referencia_externa: Option<String>,
        operador: &str,
        token_idempotencia: &str,
    ) -> Result<(Cuenta, Pago, Option<f64>), DomainError> {
        let tx = self.conn.transaction()?;

        // Idempotencia
        if !token_idempotencia.is_empty() {
            let existe: bool = tx.query_row(
                "SELECT COUNT(*) > 0 FROM pagos WHERE token_idempotencia = ?1;",
                [token_idempotencia],
                |r| r.get(0),
            )?;
            if existe {
                return Err(DomainError::SolicitudDuplicada);
            }
        }

        // Obtener cuenta bloqueando fila
        let (saldo_pendiente, total, estado_str): (f64, f64, String) = tx
            .query_row(
                "SELECT saldo_pendiente, total, estado FROM cuentas WHERE id = ?1;",
                [cuenta_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .map_err(|_| DomainError::CuentaNoEncontrada)?;

        let estado_actual = EstadoCuenta::from_str(&estado_str)?;
        if estado_actual == EstadoCuenta::Pagada || saldo_pendiente <= 0.001 {
            return Err(DomainError::CuentaYaPagada);
        }
        if estado_actual == EstadoCuenta::Cerrada {
            return Err(DomainError::CuentaYaCerrada);
        }

        let timestamp = Utc::now().to_rfc3339();

        // Validar pago en dominio
        let pago = Pago::new(
            0,
            cuenta_id,
            medio_pago.clone(),
            monto,
            monto_entregado,
            referencia_externa.clone(),
            operador.to_string(),
            timestamp.clone(),
            saldo_pendiente,
        )?;

        // Insertar pago
        tx.execute(
            "INSERT INTO pagos (
                cuenta_id, medio_pago, monto, monto_entregado, vuelto,
                referencia_externa, estado, creado_por, creado_en, token_idempotencia
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'Activo', ?7, ?8, ?9);",
            params![
                cuenta_id,
                pago.medio_pago.to_string(),
                pago.monto,
                pago.monto_entregado,
                pago.vuelto,
                pago.referencia_externa,
                pago.creado_por,
                pago.creado_en,
                token_idempotencia,
            ],
        )?;

        let pago_id = tx.last_insert_rowid();

        // Calcular nuevo saldo a partir de la suma de pagos activos
        let total_pagos_activos: f64 = tx.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE cuenta_id = ?1 AND estado = 'Activo';",
            [cuenta_id],
            |r| r.get(0),
        )?;

        let mut nuevo_saldo = total - total_pagos_activos;
        if nuevo_saldo.abs() < 0.001 {
            nuevo_saldo = 0.0;
        } else {
            nuevo_saldo = (nuevo_saldo * 100.0).round() / 100.0;
        }

        let nuevo_estado = if nuevo_saldo <= 0.001 {
            EstadoCuenta::Pagada
        } else {
            EstadoCuenta::Abierta
        };

        // Actualizar cuenta
        tx.execute(
            "UPDATE cuentas SET saldo_pendiente = ?1, estado = ?2 WHERE id = ?3;",
            params![nuevo_saldo, nuevo_estado.to_string(), cuenta_id],
        )?;

        // Auditoría
        tx.execute(
            "INSERT INTO auditoria_pagos (cuenta_id, pago_id, tipo_evento, descripcion, usuario, timestamp)
             VALUES (?1, ?2, 'PAGO_REGISTRADO', ?3, ?4, ?5);",
            params![
                cuenta_id,
                pago_id,
                format!("Pago de ${:.2} con medio {}", pago.monto, pago.medio_pago),
                operador,
                timestamp,
            ],
        )?;

        tx.commit()?;

        // Recuperar cuenta actualizada
        let cuenta_actualizada = self.obtener_cuenta(cuenta_id)?.cuenta;
        let mut pago_registrado = pago;
        pago_registrado.id = pago_id;

        Ok((cuenta_actualizada, pago_registrado.clone(), pago_registrado.vuelto))
    }

    /// Cierra definitivamente una cuenta y libera la ubicación física (saldo debe ser 0)
    pub fn cerrar_cuenta_y_liberar(&mut self, cuenta_id: i64, operador: &str) -> Result<Cuenta, DomainError> {
        let tx = self.conn.transaction()?;

        let (saldo_pendiente, estado_str, ubicacion_id): (f64, String, String) = tx
            .query_row(
                "SELECT saldo_pendiente, estado, ubicacion_id FROM cuentas WHERE id = ?1;",
                [cuenta_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .map_err(|_| DomainError::CuentaNoEncontrada)?;

        if saldo_pendiente > 0.001 {
            return Err(DomainError::SaldoPendiente);
        }

        let estado_actual = EstadoCuenta::from_str(&estado_str)?;
        if estado_actual == EstadoCuenta::Cerrada {
            return Err(DomainError::CuentaYaCerrada);
        }

        let timestamp = Utc::now().to_rfc3339();

        // Cerrar cuenta
        tx.execute(
            "UPDATE cuentas SET estado = 'Cerrada', cerrado_en = ?1 WHERE id = ?2;",
            params![timestamp, cuenta_id],
        )?;

        // Sellar comandas vinculadas a estado Cerrada
        tx.execute(
            "UPDATE comandas 
             SET estado = 'Cerrada', cerrado_en = ?1 
             WHERE id IN (SELECT comanda_id FROM cuenta_comandas WHERE cuenta_id = ?2);",
            params![timestamp, cuenta_id],
        )?;

        // Auditoría
        tx.execute(
            "INSERT INTO auditoria_pagos (cuenta_id, tipo_evento, descripcion, usuario, timestamp)
             VALUES (?1, 'CIERRE_CUENTA', ?2, ?3, ?4);",
            params![
                cuenta_id,
                format!("Cierre definitivo y liberación de ubicación {}", ubicacion_id),
                operador,
                timestamp,
            ],
        )?;

        tx.commit()?;

        let cuenta = self.obtener_cuenta(cuenta_id)?.cuenta;
        Ok(cuenta)
    }

    /// Efectúa la baja lógica de un pago y restaura el saldo de la cuenta
    pub fn anular_pago(
        &mut self,
        cuenta_id: i64,
        pago_id: i64,
        motivo: &str,
        operador: &str,
    ) -> Result<CuentaDetallada, DomainError> {
        let tx = self.conn.transaction()?;

        if motivo.trim().chars().count() < 4 {
            return Err(DomainError::MotivoRequerido);
        }

        let (pago_cuenta_id, estado_pago_str, monto_pago): (i64, String, f64) = tx
            .query_row(
                "SELECT cuenta_id, estado, monto FROM pagos WHERE id = ?1;",
                [pago_id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .map_err(|_| DomainError::PagoNoEncontrado)?;

        if pago_cuenta_id != cuenta_id {
            return Err(DomainError::PagoNoEncontrado);
        }

        if estado_pago_str == "Cancelado" {
            return Err(DomainError::PagoYaCancelado);
        }

        let timestamp = Utc::now().to_rfc3339();

        // Baja lógica del pago
        tx.execute(
            "UPDATE pagos 
             SET estado = 'Cancelado', motivo_anulacion = ?1, cancelado_en = ?2, cancelado_por = ?3 
             WHERE id = ?4;",
            params![motivo.trim(), timestamp, operador, pago_id],
        )?;

        // Recalcular saldo y estado de la cuenta
        let total_cuenta: f64 = tx.query_row(
            "SELECT total FROM cuentas WHERE id = ?1;",
            [cuenta_id],
            |r| r.get(0),
        )?;

        let total_pagos_activos: f64 = tx.query_row(
            "SELECT COALESCE(SUM(monto), 0.0) FROM pagos WHERE cuenta_id = ?1 AND estado = 'Activo';",
            [cuenta_id],
            |r| r.get(0),
        )?;

        let mut nuevo_saldo = total_cuenta - total_pagos_activos;
        if nuevo_saldo.abs() < 0.001 {
            nuevo_saldo = 0.0;
        } else {
            nuevo_saldo = (nuevo_saldo * 100.0).round() / 100.0;
        }

        let nuevo_estado = if nuevo_saldo <= 0.001 {
            EstadoCuenta::Pagada
        } else {
            EstadoCuenta::Abierta
        };

        tx.execute(
            "UPDATE cuentas SET saldo_pendiente = ?1, estado = ?2 WHERE id = ?3;",
            params![nuevo_saldo, nuevo_estado.to_string(), cuenta_id],
        )?;

        // Auditoría inmutable
        tx.execute(
            "INSERT INTO auditoria_pagos (cuenta_id, pago_id, tipo_evento, descripcion, usuario, timestamp)
             VALUES (?1, ?2, 'PAGO_ANULADO', ?3, ?4, ?5);",
            params![
                cuenta_id,
                pago_id,
                format!("Anulación de pago ${:.2}. Motivo: {}", monto_pago, motivo.trim()),
                operador,
                timestamp,
            ],
        )?;

        tx.commit()?;

        self.obtener_cuenta(cuenta_id)
    }

    /// Efectúa la baja lógica de una cuenta abierta por error (sin cobros activos)
    pub fn anular_cuenta(
        &mut self,
        cuenta_id: i64,
        motivo: &str,
        operador: &str,
    ) -> Result<Cuenta, DomainError> {
        let tx = self.conn.transaction()?;

        if motivo.trim().chars().count() < 4 {
            return Err(DomainError::MotivoRequerido);
        }

        let estado_str: String = tx
            .query_row(
                "SELECT estado FROM cuentas WHERE id = ?1;",
                [cuenta_id],
                |r| r.get(0),
            )
            .map_err(|_| DomainError::CuentaNoEncontrada)?;

        let estado = EstadoCuenta::from_str(&estado_str)?;
        if estado == EstadoCuenta::Cerrada {
            return Err(DomainError::CuentaYaCerrada);
        }

        let pagos_activos_count: i64 = tx.query_row(
            "SELECT COUNT(*) FROM pagos WHERE cuenta_id = ?1 AND estado = 'Activo';",
            [cuenta_id],
            |r| r.get(0),
        )?;
        if pagos_activos_count > 0 {
            return Err(DomainError::CuentaTienePagosActivos);
        }

        let timestamp = Utc::now().to_rfc3339();

        // Anular cuenta
        tx.execute(
            "UPDATE cuentas 
             SET estado = 'Anulada', motivo_anulacion = ?1, anulado_en = ?2, anulado_por = ?3 
             WHERE id = ?4;",
            params![motivo.trim(), timestamp, operador, cuenta_id],
        )?;

        // Desvincular las comandas para que queden disponibles para otra cuenta
        tx.execute(
            "DELETE FROM cuenta_comandas WHERE cuenta_id = ?1;",
            [cuenta_id],
        )?;

        // Auditoría inmutable
        tx.execute(
            "INSERT INTO auditoria_pagos (cuenta_id, tipo_evento, descripcion, usuario, timestamp)
             VALUES (?1, 'ANULACION_CUENTA', ?2, ?3, ?4);",
            params![
                cuenta_id,
                format!("Anulación de cuenta. Motivo: {}", motivo.trim()),
                operador,
                timestamp,
            ],
        )?;

        tx.commit()?;

        let cuenta = self.conn.query_row(
            "SELECT id, codigo_visible, ubicacion_id, ubicacion_nombre, estado, total,
                    saldo_pendiente, creado_por, creado_en, cerrado_en, anulado_en,
                    motivo_anulacion, anulado_por
             FROM cuentas WHERE id = ?1;",
            [cuenta_id],
            |r| {
                let estado_str: String = r.get(4)?;
                Ok(Cuenta {
                    id: r.get(0)?,
                    codigo_visible: r.get(1)?,
                    ubicacion_id: r.get(2)?,
                    ubicacion_nombre: r.get(3)?,
                    estado: EstadoCuenta::from_str(&estado_str).map_err(|_| rusqlite::Error::InvalidQuery)?,
                    total: r.get(5)?,
                    saldo_pendiente: r.get(6)?,
                    creado_por: r.get(7)?,
                    creado_en: r.get(8)?,
                    cerrado_en: r.get(9)?,
                    anulado_en: r.get(10)?,
                    motivo_anulacion: r.get(11)?,
                    anulado_por: r.get(12)?,
                })
            },
        ).map_err(|e| DomainError::ErrorAlmacenamiento(e.to_string()))?;

        Ok(cuenta)
    }

    /// Obtiene el resumen de arqueo de caja del turno agrupado por medio de pago
    pub fn obtener_resumen_arqueo(&mut self) -> Result<ResumenArqueo, DomainError> {
        let mut resumen = ResumenArqueo::default();

        let mut stmt = self.conn.prepare(
            "SELECT medio_pago, COALESCE(SUM(monto), 0.0) 
             FROM pagos 
             WHERE estado = 'Activo' 
             GROUP BY medio_pago;",
        )?;

        let rows = stmt.query_map([], |r| {
            let medio_str: String = r.get(0)?;
            let total: f64 = r.get(1)?;
            Ok((medio_str, total))
        })?;

        for row in rows {
            let (medio_str, total) = row?;
            match medio_str.as_str() {
                "Efectivo" => resumen.total_efectivo = total,
                "Tarjeta Débito" | "TarjetaDebito" => resumen.total_debito = total,
                "Tarjeta Crédito" | "TarjetaCredito" => resumen.total_credito = total,
                "Transferencia" => resumen.total_transferencia = total,
                _ => {}
            }
        }

        resumen.total_recaudado = resumen.total_efectivo
            + resumen.total_debito
            + resumen.total_credito
            + resumen.total_transferencia;

        resumen.cantidad_pagos_activos = self.conn.query_row(
            "SELECT COUNT(*) FROM pagos WHERE estado = 'Activo';",
            [],
            |r| r.get(0),
        ).unwrap_or(0);

        resumen.cantidad_pagos_anulados = self.conn.query_row(
            "SELECT COUNT(*) FROM pagos WHERE estado = 'Cancelado';",
            [],
            |r| r.get(0),
        ).unwrap_or(0);

        Ok(resumen)
    }
}

