// src-tauri/src/domain/catalogo.rs
// Entidades de dominio para Catálogo de Productos, Categorías e Historial de Precios (Feature 003)

use serde::{Deserialize, Serialize};
use super::errors::DomainError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoriaReferencia {
    pub id: String,
    pub nombre: String,
    pub icono: Option<String>,
    pub orden: i64,
    pub activo: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductoReferencia {
    pub id: String,
    pub nombre: String,
    pub categoria: String,
    pub precio_actual: f64,
    pub disponible_para_venta: bool,
    pub descripcion: Option<String>,
    pub activo: bool,
    pub creado_en: String,
    pub actualizado_en: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistorialPrecio {
    pub id: i64,
    pub producto_id: String,
    pub precio_anterior: f64,
    pub precio_nuevo: f64,
    pub fecha_cambio: String,
    pub usuario: String,
    pub motivo: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogoCompleto {
    pub categorias: Vec<CategoriaReferencia>,
    pub productos: Vec<ProductoReferencia>,
}

impl CategoriaReferencia {
    pub fn nueva(
        id: String,
        nombre: String,
        icono: Option<String>,
        orden: i64,
    ) -> Result<Self, DomainError> {
        if nombre.trim().is_empty() {
            return Err(DomainError::Validacion("El nombre de la categoría no puede estar vacío.".to_string()));
        }
        let clean_id = if id.trim().is_empty() {
            ProductoReferencia::generar_slug(&nombre)
        } else {
            id.trim().to_lowercase()
        };
        Ok(Self {
            id: clean_id,
            nombre: nombre.trim().to_string(),
            icono: icono.map(|i| i.trim().to_string()).filter(|i| !i.is_empty()),
            orden,
            activo: true,
        })
    }
}

impl ProductoReferencia {
    pub fn nuevo(
        id: String,
        nombre: String,
        categoria: String,
        precio_actual: f64,
        descripcion: Option<String>,
        timestamp: String,
    ) -> Result<Self, DomainError> {
        if nombre.trim().is_empty() {
            return Err(DomainError::Validacion("El nombre del producto no puede estar vacío.".to_string()));
        }
        if categoria.trim().is_empty() {
            return Err(DomainError::Validacion("Debe asignar una categoría al producto.".to_string()));
        }
        if precio_actual <= 0.0 {
            return Err(DomainError::PrecioInvalido);
        }

        let clean_id = if id.trim().is_empty() {
            Self::generar_slug(&nombre)
        } else {
            id.trim().to_lowercase()
        };

        Ok(Self {
            id: clean_id,
            nombre: nombre.trim().to_string(),
            categoria: categoria.trim().to_string(),
            precio_actual: (precio_actual * 100.0).round() / 100.0,
            disponible_para_venta: true,
            descripcion: descripcion.map(|d| d.trim().to_string()).filter(|d| !d.is_empty()),
            activo: true,
            creado_en: timestamp.clone(),
            actualizado_en: timestamp,
        })
    }

    pub fn actualizar_precio(
        &mut self,
        nuevo_precio: f64,
        operador: &str,
        motivo: Option<&str>,
        timestamp: &str,
    ) -> Result<HistorialPrecio, DomainError> {
        if nuevo_precio <= 0.0 {
            return Err(DomainError::PrecioInvalido);
        }

        let precio_anterior = self.precio_actual;
        let precio_nuevo_redondeado = (nuevo_precio * 100.0).round() / 100.0;
        self.precio_actual = precio_nuevo_redondeado;
        self.actualizado_en = timestamp.to_string();

        Ok(HistorialPrecio {
            id: 0,
            producto_id: self.id.clone(),
            precio_anterior,
            precio_nuevo: precio_nuevo_redondeado,
            fecha_cambio: timestamp.to_string(),
            usuario: operador.to_string(),
            motivo: motivo.map(|m| m.trim().to_string()).filter(|m| !m.is_empty()),
        })
    }

    pub fn cambiar_disponibilidad(&mut self, disponible: bool, timestamp: &str) {
        self.disponible_para_venta = disponible;
        self.actualizado_en = timestamp.to_string();
    }

    pub fn dar_de_baja(&mut self, timestamp: &str) {
        self.activo = false;
        self.disponible_para_venta = false;
        self.actualizado_en = timestamp.to_string();
    }

    pub fn generar_slug(nombre: &str) -> String {
        nombre
            .trim()
            .to_lowercase()
            .chars()
            .map(|c| match c {
                'a'..='z' | '0'..='9' => c,
                'á' | 'à' | 'ä' | 'â' => 'a',
                'é' | 'è' | 'ë' | 'ê' => 'e',
                'í' | 'ì' | 'ï' | 'î' => 'i',
                'ó' | 'ò' | 'ö' | 'ô' => 'o',
                'ú' | 'ù' | 'ü' | 'û' => 'u',
                'ñ' => 'n',
                _ => '-',
            })
            .collect::<String>()
            .split('-')
            .filter(|s| !s.is_empty())
            .collect::<Vec<&str>>()
            .join("-")
    }
}

