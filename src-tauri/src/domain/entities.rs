use chrono::Utc;
use serde::{Deserialize, Serialize};
use crate::domain::errors::DomainError;
use crate::domain::state::{EstadoComanda, EstadoItem};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Ubicacion {
    pub id: String,
    pub tipo: String,
    pub numero: i64,
    pub nombre: String,
    pub activo: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Producto {
    pub id: String,
    pub nombre: String,
    pub categoria: String,
    pub precio_actual: f64,
    pub activo: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemComanda {
    pub id: Option<i64>,
    pub comanda_id: Option<i64>,
    pub producto_id: String,
    pub nombre_producto: String,
    pub cantidad: i64,
    pub precio_unitario: f64,
    pub subtotal: f64,
    pub observaciones: Option<String>,
    pub estado: EstadoItem,
    pub motivo_cancelacion: Option<String>,
    pub cancelado_en: Option<String>,
    pub cancelado_por: Option<String>,
    pub creado_en: String,
}

impl ItemComanda {
    pub fn nuevo(
        producto_id: String,
        nombre_producto: String,
        cantidad: i64,
        precio_unitario: f64,
        observaciones: Option<String>,
    ) -> Result<Self, DomainError> {
        if cantidad <= 0 {
            return Err(DomainError::CantidadInvalida);
        }
        if precio_unitario < 0.0 {
            return Err(DomainError::Validacion("El precio unitario no puede ser negativo.".to_string()));
        }

        let subtotal = (cantidad as f64) * precio_unitario;
        let creado_en = Utc::now().to_rfc3339();

        Ok(Self {
            id: None,
            comanda_id: None,
            producto_id,
            nombre_producto,
            cantidad,
            precio_unitario,
            subtotal,
            observaciones,
            estado: EstadoItem::Activo,
            motivo_cancelacion: None,
            cancelado_en: None,
            cancelado_por: None,
            creado_en,
        })
    }

    pub fn cancelar(&mut self, motivo: &str, operador: &str) -> Result<(), DomainError> {
        if self.estado == EstadoItem::Cancelado {
            return Err(DomainError::ItemYaCancelado);
        }
        if motivo.trim().len() < 4 {
            return Err(DomainError::MotivoRequerido);
        }

        self.estado = EstadoItem::Cancelado;
        self.motivo_cancelacion = Some(motivo.trim().to_string());
        self.cancelado_por = Some(operador.to_string());
        self.cancelado_en = Some(Utc::now().to_rfc3339());
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Comanda {
    pub id: Option<i64>,
    pub codigo_visible: String,
    pub ubicacion_id: String,
    pub ubicacion_nombre: String,
    pub estado: EstadoComanda,
    pub total: f64,
    pub creado_por: String,
    pub creado_en: String,
    pub cerrado_en: Option<String>,
    pub anulado_en: Option<String>,
    pub motivo_anulacion: Option<String>,
    pub anulado_por: Option<String>,
    pub token_idempotencia: Option<String>,
    pub items: Vec<ItemComanda>,
}

impl Comanda {
    pub fn nueva(
        codigo_visible: String,
        ubicacion_id: String,
        ubicacion_nombre: String,
        creado_por: String,
        token_idempotencia: Option<String>,
    ) -> Result<Self, DomainError> {
        if ubicacion_id.trim().is_empty() {
            return Err(DomainError::UbicacionNoEncontrada);
        }

        let creado_en = Utc::now().to_rfc3339();

        Ok(Self {
            id: None,
            codigo_visible,
            ubicacion_id,
            ubicacion_nombre,
            estado: EstadoComanda::Borrador,
            total: 0.0,
            creado_por,
            creado_en,
            cerrado_en: None,
            anulado_en: None,
            motivo_anulacion: None,
            anulado_por: None,
            token_idempotencia,
            items: Vec::new(),
        })
    }

    pub fn agregar_item(&mut self, item: ItemComanda) -> Result<(), DomainError> {
        self.estado.asegurar_modificable()?;
        self.items.push(item);
        self.recalcular_total();
        Ok(())
    }

    pub fn recalcular_total(&mut self) {
        let total: f64 = self
            .items
            .iter()
            .filter(|it| it.estado == EstadoItem::Activo)
            .map(|it| it.subtotal)
            .sum();
        self.total = (total * 100.0).round() / 100.0;
    }

    pub fn confirmar_apertura(&mut self) -> Result<(), DomainError> {
        if self.items.is_empty() {
            return Err(DomainError::ComandaVacia);
        }
        let hay_items_activos = self.items.iter().any(|i| i.estado == EstadoItem::Activo);
        if !hay_items_activos {
            return Err(DomainError::ComandaVacia);
        }

        self.recalcular_total();
        self.estado = EstadoComanda::Abierta;
        Ok(())
    }

    pub fn anular(&mut self, motivo: &str, operador: &str) -> Result<(), DomainError> {
        if self.estado == EstadoComanda::Anulada {
            return Err(DomainError::ComandaEstadoInvalido("La comanda ya fue anulada previamente.".to_string()));
        }
        if self.estado == EstadoComanda::Cerrada {
            return Err(DomainError::ComandaEstadoInvalido("No se puede anular una comanda que ya fue cerrada operativamente.".to_string()));
        }
        if motivo.trim().len() < 4 {
            return Err(DomainError::MotivoRequerido);
        }

        self.estado = EstadoComanda::Anulada;
        self.motivo_anulacion = Some(motivo.trim().to_string());
        self.anulado_por = Some(operador.to_string());
        self.anulado_en = Some(Utc::now().to_rfc3339());
        Ok(())
    }

    pub fn cerrar(&mut self) -> Result<(), DomainError> {
        self.estado.asegurar_modificable()?;
        self.estado = EstadoComanda::Cerrada;
        self.cerrado_en = Some(Utc::now().to_rfc3339());
        Ok(())
    }

    pub fn cancelar_item(&mut self, item_id: i64, motivo: &str, operador: &str) -> Result<(), DomainError> {
        self.estado.asegurar_modificable()?;
        let item = self
            .items
            .iter_mut()
            .find(|it| it.id == Some(item_id))
            .ok_or(DomainError::ItemNoEncontrado)?;

        item.cancelar(motivo, operador)?;
        self.recalcular_total();
        Ok(())
    }
}

