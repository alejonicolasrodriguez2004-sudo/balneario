// src-tauri/src/storage/catalogo_repo.rs
// Repositorio SQLite para Catálogo de Productos, Categorías y Blindaje Histórico de Precios (Feature 003)

use rusqlite::{params, Connection};
use crate::domain::catalogo::{CatalogoCompleto, CategoriaReferencia, HistorialPrecio, ProductoReferencia};
use crate::domain::errors::DomainError;

pub struct CatalogoRepository<'a> {
    conn: &'a mut Connection,
}

impl<'a> CatalogoRepository<'a> {
    pub fn new(conn: &'a mut Connection) -> Self {
        Self { conn }
    }

    pub fn listar_catalogo_completo(&mut self, incluir_inactivos: bool) -> Result<CatalogoCompleto, DomainError> {
        let cat_query = if incluir_inactivos {
            "SELECT id, nombre, icono, orden, activo FROM categorias_referencia ORDER BY orden ASC, nombre ASC;"
        } else {
            "SELECT id, nombre, icono, orden, activo FROM categorias_referencia WHERE activo = 1 ORDER BY orden ASC, nombre ASC;"
        };

        let mut stmt_cat = self.conn.prepare(cat_query)?;
        let cat_iter = stmt_cat.query_map([], |row| {
            Ok(CategoriaReferencia {
                id: row.get(0)?,
                nombre: row.get(1)?,
                icono: row.get(2)?,
                orden: row.get(3)?,
                activo: row.get::<_, i64>(4)? == 1,
            })
        })?;

        let mut categorias = Vec::new();
        for c in cat_iter {
            categorias.push(c?);
        }

        let prod_query = if incluir_inactivos {
            "SELECT id, nombre, categoria, precio_actual, disponible_para_venta, descripcion, activo, creado_en, actualizado_en 
             FROM productos_referencia ORDER BY categoria ASC, nombre ASC;"
        } else {
            "SELECT id, nombre, categoria, precio_actual, disponible_para_venta, descripcion, activo, creado_en, actualizado_en 
             FROM productos_referencia WHERE activo = 1 ORDER BY categoria ASC, nombre ASC;"
        };

        let mut stmt_prod = self.conn.prepare(prod_query)?;
        let prod_iter = stmt_prod.query_map([], |row| {
            Ok(ProductoReferencia {
                id: row.get(0)?,
                nombre: row.get(1)?,
                categoria: row.get(2)?,
                precio_actual: row.get(3)?,
                disponible_para_venta: row.get::<_, i64>(4)? == 1,
                descripcion: row.get(5)?,
                activo: row.get::<_, i64>(6)? == 1,
                creado_en: row.get(7)?,
                actualizado_en: row.get(8)?,
            })
        })?;

        let mut productos = Vec::new();
        for p in prod_iter {
            productos.push(p?);
        }

        Ok(CatalogoCompleto {
            categorias,
            productos,
        })
    }

    pub fn obtener_producto_por_id(&mut self, id: &str) -> Result<ProductoReferencia, DomainError> {
        self.conn.query_row(
            "SELECT id, nombre, categoria, precio_actual, disponible_para_venta, descripcion, activo, creado_en, actualizado_en 
             FROM productos_referencia WHERE id = ?1;",
            [id],
            |row| {
                Ok(ProductoReferencia {
                    id: row.get(0)?,
                    nombre: row.get(1)?,
                    categoria: row.get(2)?,
                    precio_actual: row.get(3)?,
                    disponible_para_venta: row.get::<_, i64>(4)? == 1,
                    descripcion: row.get(5)?,
                    activo: row.get::<_, i64>(6)? == 1,
                    creado_en: row.get(7)?,
                    actualizado_en: row.get(8)?,
                })
            },
        ).map_err(|_| DomainError::ProductoNoEncontrado)
    }

    pub fn crear_producto(&mut self, producto: &ProductoReferencia, operador: &str) -> Result<ProductoReferencia, DomainError> {
        let tx = self.conn.transaction()?;

        let existe: bool = tx.query_row(
            "SELECT COUNT(*) > 0 FROM productos_referencia WHERE id = ?1;",
            [&producto.id],
            |r| r.get(0),
        )?;

        if existe {
            return Err(DomainError::ProductoYaExiste);
        }

        tx.execute(
            "INSERT INTO productos_referencia (
                id, nombre, categoria, precio_actual, disponible_para_venta, descripcion, activo, creado_en, actualizado_en
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9);",
            params![
                producto.id,
                producto.nombre,
                producto.categoria,
                producto.precio_actual,
                if producto.disponible_para_venta { 1 } else { 0 },
                producto.descripcion,
                if producto.activo { 1 } else { 0 },
                producto.creado_en,
                producto.actualizado_en,
            ],
        )?;

        // Inserción en historial de precios inicial
        tx.execute(
            "INSERT INTO historial_precios (
                producto_id, precio_anterior, precio_nuevo, fecha_cambio, usuario, motivo
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6);",
            params![
                producto.id,
                0.0,
                producto.precio_actual,
                producto.creado_en,
                operador,
                "Precio inicial de alta",
            ],
        )?;

        tx.commit()?;
        Ok(producto.clone())
    }

    pub fn actualizar_producto(
        &mut self,
        id: &str,
        nombre: &str,
        categoria: &str,
        descripcion: Option<String>,
        timestamp: &str,
    ) -> Result<ProductoReferencia, DomainError> {
        let mut producto = self.obtener_producto_por_id(id)?;

        if nombre.trim().is_empty() {
            return Err(DomainError::Validacion("El nombre no puede estar vacío.".to_string()));
        }
        if categoria.trim().is_empty() {
            return Err(DomainError::Validacion("La categoría no puede estar vacía.".to_string()));
        }

        producto.nombre = nombre.trim().to_string();
        producto.categoria = categoria.trim().to_string();
        producto.descripcion = descripcion.map(|d| d.trim().to_string()).filter(|d| !d.is_empty());
        producto.actualizado_en = timestamp.to_string();

        self.conn.execute(
            "UPDATE productos_referencia 
             SET nombre = ?1, categoria = ?2, descripcion = ?3, actualizado_en = ?4 
             WHERE id = ?5;",
            params![
                producto.nombre,
                producto.categoria,
                producto.descripcion,
                producto.actualizado_en,
                producto.id,
            ],
        )?;

        Ok(producto)
    }

    pub fn actualizar_precio_producto(
        &mut self,
        producto_id: &str,
        nuevo_precio: f64,
        operador: &str,
        motivo: Option<&str>,
        timestamp: &str,
    ) -> Result<ProductoReferencia, DomainError> {
        let tx = self.conn.transaction()?;

        let mut producto = tx.query_row(
            "SELECT id, nombre, categoria, precio_actual, disponible_para_venta, descripcion, activo, creado_en, actualizado_en 
             FROM productos_referencia WHERE id = ?1;",
            [producto_id],
            |row| {
                Ok(ProductoReferencia {
                    id: row.get(0)?,
                    nombre: row.get(1)?,
                    categoria: row.get(2)?,
                    precio_actual: row.get(3)?,
                    disponible_para_venta: row.get::<_, i64>(4)? == 1,
                    descripcion: row.get(5)?,
                    activo: row.get::<_, i64>(6)? == 1,
                    creado_en: row.get(7)?,
                    actualizado_en: row.get(8)?,
                })
            },
        ).map_err(|_| DomainError::ProductoNoEncontrado)?;

        let historial = producto.actualizar_precio(nuevo_precio, operador, motivo, timestamp)?;

        tx.execute(
            "UPDATE productos_referencia 
             SET precio_actual = ?1, actualizado_en = ?2 
             WHERE id = ?3;",
            params![producto.precio_actual, producto.actualizado_en, producto.id],
        )?;

        tx.execute(
            "INSERT INTO historial_precios (
                producto_id, precio_anterior, precio_nuevo, fecha_cambio, usuario, motivo
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6);",
            params![
                historial.producto_id,
                historial.precio_anterior,
                historial.precio_nuevo,
                historial.fecha_cambio,
                historial.usuario,
                historial.motivo,
            ],
        )?;

        tx.commit()?;
        Ok(producto)
    }

    pub fn cambiar_disponibilidad_producto(
        &mut self,
        producto_id: &str,
        disponible: bool,
        timestamp: &str,
    ) -> Result<ProductoReferencia, DomainError> {
        let mut producto = self.obtener_producto_por_id(producto_id)?;
        producto.cambiar_disponibilidad(disponible, timestamp);

        self.conn.execute(
            "UPDATE productos_referencia 
             SET disponible_para_venta = ?1, actualizado_en = ?2 
             WHERE id = ?3;",
            params![
                if producto.disponible_para_venta { 1 } else { 0 },
                producto.actualizado_en,
                producto.id,
            ],
        )?;

        Ok(producto)
    }

    pub fn dar_baja_producto(
        &mut self,
        producto_id: &str,
        timestamp: &str,
    ) -> Result<ProductoReferencia, DomainError> {
        let mut producto = self.obtener_producto_por_id(producto_id)?;
        producto.dar_de_baja(timestamp);

        self.conn.execute(
            "UPDATE productos_referencia 
             SET activo = 0, disponible_para_venta = 0, actualizado_en = ?1 
             WHERE id = ?2;",
            params![producto.actualizado_en, producto.id],
        )?;

        Ok(producto)
    }

    pub fn obtener_historial_precios(&mut self, producto_id: &str) -> Result<Vec<HistorialPrecio>, DomainError> {
        let mut stmt = self.conn.prepare(
            "SELECT id, producto_id, precio_anterior, precio_nuevo, fecha_cambio, usuario, motivo 
             FROM historial_precios WHERE producto_id = ?1 ORDER BY id DESC;"
        )?;

        let iter = stmt.query_map([producto_id], |row| {
            Ok(HistorialPrecio {
                id: row.get(0)?,
                producto_id: row.get(1)?,
                precio_anterior: row.get(2)?,
                precio_nuevo: row.get(3)?,
                fecha_cambio: row.get(4)?,
                usuario: row.get(5)?,
                motivo: row.get(6)?,
            })
        })?;

        let mut historial = Vec::new();
        for h in iter {
            historial.push(h?);
        }
        Ok(historial)
    }

    pub fn listar_categorias(&mut self, solo_activas: bool) -> Result<Vec<CategoriaReferencia>, DomainError> {
        let query = if solo_activas {
            "SELECT id, nombre, icono, orden, activo FROM categorias_referencia WHERE activo = 1 ORDER BY orden ASC, nombre ASC;"
        } else {
            "SELECT id, nombre, icono, orden, activo FROM categorias_referencia ORDER BY orden ASC, nombre ASC;"
        };

        let mut stmt = self.conn.prepare(query)?;
        let iter = stmt.query_map([], |row| {
            Ok(CategoriaReferencia {
                id: row.get(0)?,
                nombre: row.get(1)?,
                icono: row.get(2)?,
                orden: row.get(3)?,
                activo: row.get::<_, i64>(4)? == 1,
            })
        })?;

        let mut categorias = Vec::new();
        for c in iter {
            categorias.push(c?);
        }
        Ok(categorias)
    }

    pub fn guardar_categoria(&mut self, categoria: &CategoriaReferencia) -> Result<CategoriaReferencia, DomainError> {
        self.conn.execute(
            "INSERT INTO categorias_referencia (id, nombre, icono, orden, activo) 
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET 
                nombre = excluded.nombre, 
                icono = excluded.icono, 
                orden = excluded.orden, 
                activo = excluded.activo;",
            params![
                categoria.id,
                categoria.nombre,
                categoria.icono,
                categoria.orden,
                if categoria.activo { 1 } else { 0 },
            ],
        )?;

        Ok(categoria.clone())
    }
}

