use rusqlite::Connection;
use crate::domain::entities::{Producto, Ubicacion};
use crate::domain::errors::DomainError;

pub struct ReferenceRepository<'a> {
    conn: &'a Connection,
}

impl<'a> ReferenceRepository<'a> {
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    pub fn listar_ubicaciones(&self) -> Result<Vec<Ubicacion>, DomainError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, tipo, numero, nombre, activo FROM ubicaciones_referencia WHERE activo = 1 ORDER BY tipo, numero ASC;"
        )?;

        let iter = stmt.query_map([], |row| {
            Ok(Ubicacion {
                id: row.get(0)?,
                tipo: row.get(1)?,
                numero: row.get(2)?,
                nombre: row.get(3)?,
                activo: row.get::<_, i64>(4)? == 1,
            })
        })?;

        let mut ubicaciones = Vec::new();
        for u in iter {
            ubicaciones.push(u?);
        }
        Ok(ubicaciones)
    }

    pub fn obtener_ubicacion(&self, id: &str) -> Result<Ubicacion, DomainError> {
        self.conn.query_row(
            "SELECT id, tipo, numero, nombre, activo FROM ubicaciones_referencia WHERE id = ?1 AND activo = 1;",
            [id],
            |row| {
                Ok(Ubicacion {
                    id: row.get(0)?,
                    tipo: row.get(1)?,
                    numero: row.get(2)?,
                    nombre: row.get(3)?,
                    activo: row.get::<_, i64>(4)? == 1,
                })
            },
        ).map_err(|_| DomainError::UbicacionNoEncontrada)
    }

    pub fn listar_productos(&self) -> Result<Vec<Producto>, DomainError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, nombre, categoria, precio_actual, activo, disponible_para_venta, descripcion 
             FROM productos_referencia WHERE activo = 1 ORDER BY categoria, nombre ASC;"
        )?;

        let iter = stmt.query_map([], |row| {
            Ok(Producto {
                id: row.get(0)?,
                nombre: row.get(1)?,
                categoria: row.get(2)?,
                precio_actual: row.get(3)?,
                activo: row.get::<_, i64>(4)? == 1,
                disponible_para_venta: row.get::<_, Option<i64>>(5)?.unwrap_or(1) == 1,
                descripcion: row.get(6)?,
            })
        })?;

        let mut productos = Vec::new();
        for p in iter {
            productos.push(p?);
        }
        Ok(productos)
    }

    pub fn obtener_producto(&self, id: &str) -> Result<Producto, DomainError> {
        self.conn.query_row(
            "SELECT id, nombre, categoria, precio_actual, activo, disponible_para_venta, descripcion 
             FROM productos_referencia WHERE id = ?1 AND activo = 1;",
            [id],
            |row| {
                Ok(Producto {
                    id: row.get(0)?,
                    nombre: row.get(1)?,
                    categoria: row.get(2)?,
                    precio_actual: row.get(3)?,
                    activo: row.get::<_, i64>(4)? == 1,
                    disponible_para_venta: row.get::<_, Option<i64>>(5)?.unwrap_or(1) == 1,
                    descripcion: row.get(6)?,
                })
            },
        ).map_err(|_| DomainError::ProductoNoEncontrado)
    }
}
