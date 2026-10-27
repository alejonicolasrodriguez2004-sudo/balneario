use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error, PartialEq, Eq, Clone)]
pub enum DomainError {
    #[error("La ubicación indicada no existe o se encuentra inactiva.")]
    UbicacionNoEncontrada,

    #[error("La comanda debe contener al menos un producto con cantidad positiva.")]
    ComandaVacia,

    #[error("La cantidad de producto debe ser un número entero mayor a cero.")]
    CantidadInvalida,

    #[error("El producto seleccionado no existe en el catálogo comercial.")]
    ProductoNoEncontrado,

    #[error("No se encontró la comanda solicitada.")]
    ComandaNoEncontrada,

    #[error("La comanda no admite modificaciones porque se encuentra en estado '{0}'.")]
    ComandaEstadoInvalido(String),

    #[error("Debe ingresar obligatoriamente un motivo justificado (mínimo 4 caracteres).")]
    MotivoRequerido,

    #[error("El ítem indicado no pertenece a la comanda o no existe.")]
    ItemNoEncontrado,

    #[error("El ítem ya se encontraba cancelado previamente.")]
    ItemYaCancelado,

    #[error("Esta solicitud ya ha sido procesada previamente (operación duplicada).")]
    SolicitudDuplicada,

    #[error("Error de base de datos o almacenamiento local: {0}")]
    ErrorAlmacenamiento(String),

    #[error("Validación fallida: {0}")]
    Validacion(String),
}

impl DomainError {
    pub fn codigo(&self) -> &'static str {
        match self {
            DomainError::UbicacionNoEncontrada => "UBICACION_NO_ENCONTRADA",
            DomainError::ComandaVacia => "COMANDA_VACIA",
            DomainError::CantidadInvalida => "CANTIDAD_INVALIDA",
            DomainError::ProductoNoEncontrado => "PRODUCTO_NO_ENCONTRADO",
            DomainError::ComandaNoEncontrada => "COMANDA_NO_ENCONTRADA",
            DomainError::ComandaEstadoInvalido(_) => "COMANDA_ESTADO_INVALIDO",
            DomainError::MotivoRequerido => "MOTIVO_REQUERIDO",
            DomainError::ItemNoEncontrado => "ITEM_NO_ENCONTRADO",
            DomainError::ItemYaCancelado => "ITEM_YA_CANCELADO",
            DomainError::SolicitudDuplicada => "SOLICITUD_DUPLICADA",
            DomainError::ErrorAlmacenamiento(_) => "ERROR_PERSISTENCIA",
            DomainError::Validacion(_) => "ERROR_VALIDACION",
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ErrorDto {
    pub codigo: String,
    pub mensaje: String,
    pub detalles: Option<String>,
}

impl From<DomainError> for ErrorDto {
    fn from(err: DomainError) -> Self {
        Self {
            codigo: err.codigo().to_string(),
            mensaje: err.to_string(),
            detalles: None,
        }
    }
}

impl From<rusqlite::Error> for DomainError {
    fn from(err: rusqlite::Error) -> Self {
        DomainError::ErrorAlmacenamiento(err.to_string())
    }
}

