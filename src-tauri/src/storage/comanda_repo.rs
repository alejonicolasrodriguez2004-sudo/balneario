use chrono::Utc;
use rusqlite::{params, Connection};
use std::str::FromStr;
use crate::domain::entities::{Comanda, ItemComanda};
use crate::domain::errors::DomainError;
use crate::domain::state::{EstadoComanda, EstadoItem};

pub struct ComandaRepository<'a> {
    conn: &'a mut Connection,
}

impl<'a> ComandaRepository<'a> {
    pub fn new(conn: &'a mut Connection) -> Self {
        Self { conn }
    }

    pub fn crear_comanda(&mut self, comanda: &mut Comanda) -> Result<i64, DomainError> {
        let tx = self.conn.transaction()?;

        // Idempotencia: Verificar token único de solicitud
        if let Some(ref token) = comanda.token_idempotencia {
            let existe: bool = tx.query_row(
                "SELECT COUNT(*) > 0 FROM comandas WHERE token_idempotencia = ?1;",
                [token],
                |r| r.get(0),
            )?;
            if existe {
                return Err(DomainError::SolicitudDuplicada);
            }
        }

        // Generar número correlativo visible para el día si no viene prefijado
        if comanda.codigo_visible.is_empty() {
            let hoy = Utc::now().format("%Y%m%d").to_string();
            let count_hoy: i64 = tx.query_row(
                "SELECT COUNT(*) FROM comandas WHERE creado_en LIKE ?1 || '%';",
                [&hoy],
                |r| r.get(0),
            ).unwrap_or(0);
            comanda.codigo_visible = format!("CMD-{}-{:04}", hoy, count_hoy + 1);
        }

        // Confirmar estado inicial Abierta
        comanda.confirmar_apertura()?;

        tx.execute(
            "INSERT INTO comandas (
                codigo_visible, ubicacion_id, ubicacion_nombre, estado, total,
                creado_por, creado_en, token_idempotencia
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8);",
            params![
                comanda.codigo_visible,
                comanda.ubicacion_id,
                comanda.ubicacion_nombre,
                comanda.estado.to_string(),
                comanda.total,
                comanda.creado_por,
                comanda.creado_en,
                comanda.token_idempotencia,
            ],
        )?;

        let comanda_id = tx.last_insert_rowid();
        comanda.id = Some(comanda_id);

        for item in &mut comanda.items {
            tx.execute(
                "INSERT INTO items_comanda (
                    comanda_id, producto_id, nombre_producto, cantidad, precio_unitario,
                    subtotal, observaciones, estado, creado_en
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9);",
                params![
                    comanda_id,
                    item.producto_id,
                    item.nombre_producto,
                    item.cantidad,
                    item.precio_unitario,
                    item.subtotal,
                    item.observaciones,
                    item.estado.to_string(),
                    item.creado_en,
                ],
            )?;
            item.id = Some(tx.last_insert_rowid());
            item.comanda_id = Some(comanda_id);
        }

        // Auditoría inmutable de creación
        tx.execute(
            "INSERT INTO auditoria_comandas (comanda_id, tipo_evento, descripcion, usuario, timestamp)
             VALUES (?1, 'CREACION', ?2, ?3, ?4);",
            params![
                comanda_id,
                format!("Creación de comanda {} con {} ítems. Total: ${:.2}", comanda.codigo_visible, comanda.items.len(), comanda.total),
                comanda.creado_por,
                comanda.creado_en,
            ],
        )?;

        tx.commit()?;
        Ok(comanda_id)
    }

    pub fn agregar_items(
        &mut self,
        comanda_id: i64,
        nuevos_items: Vec<ItemComanda>,
        operador: &str,
    ) -> Result<Comanda, DomainError> {
        if nuevos_items.is_empty() {
            return Err(DomainError::ComandaVacia);
        }

        let tx = self.conn.transaction()?;

        // Verificar existencia y estado de la comanda
        let (estado_str, total_actual): (String, f64) = tx.query_row(
            "SELECT estado, total FROM comandas WHERE id = ?1;",
            [comanda_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        ).map_err(|_| DomainError::ComandaNoEncontrada)?;

        let estado = EstadoComanda::from_str(&estado_str)?;
        estado.asegurar_modificable()?;

        let mut subtotal_adicional = 0.0;
        let now = Utc::now().to_rfc3339();

        for item in &nuevos_items {
            tx.execute(
                "INSERT INTO items_comanda (
                    comanda_id, producto_id, nombre_producto, cantidad, precio_unitario,
                    subtotal, observaciones, estado, creado_en
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9);",
                params![
                    comanda_id,
                    item.producto_id,
                    item.nombre_producto,
                    item.cantidad,
                    item.precio_unitario,
                    item.subtotal,
                    item.observaciones,
                    item.estado.to_string(),
                    now,
                ],
            )?;
            subtotal_adicional += item.subtotal;
        }

        let nuevo_total = ((total_actual + subtotal_adicional) * 100.0).round() / 100.0;

        tx.execute(
            "UPDATE comandas SET total = ?1 WHERE id = ?2;",
            params![nuevo_total, comanda_id],
        )?;

        tx.execute(
            "INSERT INTO auditoria_comandas (comanda_id, tipo_evento, descripcion, usuario, timestamp)
             VALUES (?1, 'ADICION_ITEMS', ?2, ?3, ?4);",
            params![
                comanda_id,
                format!("Adición de {} productos adicionales por valor de ${:.2}", nuevos_items.len(), subtotal_adicional),
                operador,
                now,
            ],
        )?;

        tx.commit()?;
        self.obtener_comanda(comanda_id)
    }

    pub fn anular_comanda(&mut self, comanda_id: i64, motivo: &str, operador: &str) -> Result<Comanda, DomainError> {
        if motivo.trim().len() < 4 {
            return Err(DomainError::MotivoRequerido);
        }

        let tx = self.conn.transaction()?;

        let estado_str: String = tx.query_row(
            "SELECT estado FROM comandas WHERE id = ?1;",
            [comanda_id],
            |r| r.get(0),
        ).map_err(|_| DomainError::ComandaNoEncontrada)?;

        let estado = EstadoComanda::from_str(&estado_str)?;
        if estado == EstadoComanda::Anulada {
            return Err(DomainError::ComandaEstadoInvalido("La comanda ya fue anulada previamente.".to_string()));
        }
        if estado == EstadoComanda::Cerrada {
            return Err(DomainError::ComandaEstadoInvalido("No se puede anular una comanda ya cerrada.".to_string()));
        }

        let now = Utc::now().to_rfc3339();

        tx.execute(
            "UPDATE comandas SET estado = 'Anulada', motivo_anulacion = ?1, anulado_por = ?2, anulado_en = ?3 WHERE id = ?4;",
            params![motivo.trim(), operador, now, comanda_id],
        )?;

        tx.execute(
            "INSERT INTO auditoria_comandas (comanda_id, tipo_evento, descripcion, usuario, timestamp)
             VALUES (?1, 'ANULACION_COMANDA', ?2, ?3, ?4);",
            params![
                comanda_id,
                format!("Comanda anulada por {}. Motivo: {}", operador, motivo.trim()),
                operador,
                now,
            ],
        )?;

        tx.commit()?;
        self.obtener_comanda(comanda_id)
    }

    pub fn cerrar_comanda(&mut self, comanda_id: i64, operador: &str) -> Result<Comanda, DomainError> {
        let tx = self.conn.transaction()?;

        let estado_str: String = tx.query_row(
            "SELECT estado FROM comandas WHERE id = ?1;",
            [comanda_id],
            |r| r.get(0),
        ).map_err(|_| DomainError::ComandaNoEncontrada)?;

        let estado = EstadoComanda::from_str(&estado_str)?;
        estado.asegurar_modificable()?;

        let now = Utc::now().to_rfc3339();

        tx.execute(
            "UPDATE comandas SET estado = 'Cerrada', cerrado_en = ?1 WHERE id = ?2;",
            params![now, comanda_id],
        )?;

        tx.execute(
            "INSERT INTO auditoria_comandas (comanda_id, tipo_evento, descripcion, usuario, timestamp)
             VALUES (?1, 'CIERRE', ?2, ?3, ?4);",
            params![
                comanda_id,
                format!("Cierre operativo de comanda realizado por {}", operador),
                operador,
                now,
            ],
        )?;

        tx.commit()?;
        self.obtener_comanda(comanda_id)
    }

    pub fn cancelar_item(
        &mut self,
        comanda_id: i64,
        item_id: i64,
        motivo: &str,
        operador: &str,
    ) -> Result<Comanda, DomainError> {
        if motivo.trim().len() < 4 {
            return Err(DomainError::MotivoRequerido);
        }

        let tx = self.conn.transaction()?;

        let estado_str: String = tx.query_row(
            "SELECT estado FROM comandas WHERE id = ?1;",
            [comanda_id],
            |r| r.get(0),
        ).map_err(|_| DomainError::ComandaNoEncontrada)?;

        let estado = EstadoComanda::from_str(&estado_str)?;
        estado.asegurar_modificable()?;

        let (subtotal_item, estado_item_str, nombre_producto): (f64, String, String) = tx.query_row(
            "SELECT subtotal, estado, nombre_producto FROM items_comanda WHERE id = ?1 AND comanda_id = ?2;",
            params![item_id, comanda_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        ).map_err(|_| DomainError::ItemNoEncontrado)?;

        if estado_item_str == "Cancelado" {
            return Err(DomainError::ItemYaCancelado);
        }

        let now = Utc::now().to_rfc3339();

        tx.execute(
            "UPDATE items_comanda SET estado = 'Cancelado', motivo_cancelacion = ?1, cancelado_por = ?2, cancelado_en = ?3 WHERE id = ?4;",
            params![motivo.trim(), operador, now, item_id],
        )?;

        // Recalcular total acumulado activo
        let nuevo_total: f64 = tx.query_row(
            "SELECT COALESCE(SUM(subtotal), 0.0) FROM items_comanda WHERE comanda_id = ?1 AND estado = 'Activo';",
            [comanda_id],
            |r| r.get(0),
        )?;

        tx.execute(
            "UPDATE comandas SET total = ?1 WHERE id = ?2;",
            params![nuevo_total, comanda_id],
        )?;

        tx.execute(
            "INSERT INTO auditoria_comandas (comanda_id, tipo_evento, descripcion, usuario, timestamp)
             VALUES (?1, 'CANCELACION_ITEM', ?2, ?3, ?4);",
            params![
                comanda_id,
                format!("Cancelación de ítem '{}' por ${:.2}. Motivo: {}", nombre_producto, subtotal_item, motivo.trim()),
                operador,
                now,
            ],
        )?;

        tx.commit()?;
        self.obtener_comanda(comanda_id)
    }

    pub fn obtener_comanda(&self, comanda_id: i64) -> Result<Comanda, DomainError> {
        let mut comanda = self.conn.query_row(
            "SELECT id, codigo_visible, ubicacion_id, ubicacion_nombre, estado, total,
                    creado_por, creado_en, cerrado_en, anulado_en, motivo_anulacion, anulado_por, token_idempotencia
             FROM comandas WHERE id = ?1;",
            [comanda_id],
            |r| {
                let estado_s: String = r.get(4)?;
                Ok(Comanda {
                    id: Some(r.get(0)?),
                    codigo_visible: r.get(1)?,
                    ubicacion_id: r.get(2)?,
                    ubicacion_nombre: r.get(3)?,
                    estado: EstadoComanda::from_str(&estado_s).unwrap_or(EstadoComanda::Abierta),
                    total: r.get(5)?,
                    creado_por: r.get(6)?,
                    creado_en: r.get(7)?,
                    cerrado_en: r.get(8)?,
                    anulado_en: r.get(9)?,
                    motivo_anulacion: r.get(10)?,
                    anulado_por: r.get(11)?,
                    token_idempotencia: r.get(12)?,
                    items: Vec::new(),
                })
            },
        ).map_err(|_| DomainError::ComandaNoEncontrada)?;

        let mut stmt = self.conn.prepare(
            "SELECT id, comanda_id, producto_id, nombre_producto, cantidad, precio_unitario,
                    subtotal, observaciones, estado, motivo_cancelacion, cancelado_en, cancelado_por, creado_en
             FROM items_comanda WHERE comanda_id = ?1 ORDER BY id ASC;",
        )?;

        let items_iter = stmt.query_map([comanda_id], |r| {
            let estado_s: String = r.get(8)?;
            Ok(ItemComanda {
                id: Some(r.get(0)?),
                comanda_id: Some(r.get(1)?),
                producto_id: r.get(2)?,
                nombre_producto: r.get(3)?,
                cantidad: r.get(4)?,
                precio_unitario: r.get(5)?,
                subtotal: r.get(6)?,
                observaciones: r.get(7)?,
                estado: EstadoItem::from_str(&estado_s).unwrap_or(EstadoItem::Activo),
                motivo_cancelacion: r.get(9)?,
                cancelado_en: r.get(10)?,
                cancelado_por: r.get(11)?,
                creado_en: r.get(12)?,
            })
        })?;

        for it in items_iter {
            comanda.items.push(it?);
        }

        Ok(comanda)
    }

    pub fn listar_comandas(
        &self,
        filtro_estado: Option<&str>,
        filtro_ubicacion_id: Option<&str>,
    ) -> Result<Vec<Comanda>, DomainError> {
        let mut query = String::from(
            "SELECT id, codigo_visible, ubicacion_id, ubicacion_nombre, estado, total,
                    creado_por, creado_en, cerrado_en, anulado_en, motivo_anulacion, anulado_por, token_idempotencia
             FROM comandas WHERE 1=1"
        );

        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(estado) = filtro_estado {
            if !estado.is_empty() && estado != "Todas" {
                query.push_str(" AND estado = ?");
                params_vec.push(Box::new(estado.to_string()));
            }
        }

        if let Some(ubicacion) = filtro_ubicacion_id {
            if !ubicacion.is_empty() {
                query.push_str(" AND ubicacion_id = ?");
                params_vec.push(Box::new(ubicacion.to_string()));
            }
        }

        query.push_str(" ORDER BY id DESC;");

        let mut stmt = self.conn.prepare(&query)?;
        let params_slice: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| &**b).collect();

        let iter = stmt.query_map(&params_slice[..], |r| {
            let estado_s: String = r.get(4)?;
            Ok(Comanda {
                id: Some(r.get(0)?),
                codigo_visible: r.get(1)?,
                ubicacion_id: r.get(2)?,
                ubicacion_nombre: r.get(3)?,
                estado: EstadoComanda::from_str(&estado_s).unwrap_or(EstadoComanda::Abierta),
                total: r.get(5)?,
                creado_por: r.get(6)?,
                creado_en: r.get(7)?,
                cerrado_en: r.get(8)?,
                anulado_en: r.get(9)?,
                motivo_anulacion: r.get(10)?,
                anulado_por: r.get(11)?,
                token_idempotencia: r.get(12)?,
                items: Vec::new(),
            })
        })?;

        let mut comandas = Vec::new();
        for c in iter {
            comandas.push(c?);
        }
        Ok(comandas)
    }
}

