use serde::{Deserialize, Serialize};
use std::fmt;
use crate::domain::errors::DomainError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EstadoComanda {
    Borrador,
    Abierta,
    Cerrada,
    Anulada,
}

impl fmt::Display for EstadoComanda {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EstadoComanda::Borrador => write!(f, "Borrador"),
            EstadoComanda::Abierta => write!(f, "Abierta"),
            EstadoComanda::Cerrada => write!(f, "Cerrada"),
            EstadoComanda::Anulada => write!(f, "Anulada"),
        }
    }
}

impl std::str::FromStr for EstadoComanda {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Borrador" => Ok(EstadoComanda::Borrador),
            "Abierta" => Ok(EstadoComanda::Abierta),
            "Cerrada" => Ok(EstadoComanda::Cerrada),
            "Anulada" => Ok(EstadoComanda::Anulada),
            otro => Err(DomainError::Validacion(format!("Estado de comanda inválido: {}", otro))),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EstadoItem {
    Activo,
    Cancelado,
}

impl fmt::Display for EstadoItem {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EstadoItem::Activo => write!(f, "Activo"),
            EstadoItem::Cancelado => write!(f, "Cancelado"),
        }
    }
}

impl std::str::FromStr for EstadoItem {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Activo" => Ok(EstadoItem::Activo),
            "Cancelado" => Ok(EstadoItem::Cancelado),
            otro => Err(DomainError::Validacion(format!("Estado de ítem inválido: {}", otro))),
        }
    }
}

impl EstadoComanda {
    pub fn asegurar_modificable(&self) -> Result<(), DomainError> {
        match self {
            EstadoComanda::Borrador | EstadoComanda::Abierta => Ok(()),
            EstadoComanda::Cerrada => Err(DomainError::ComandaEstadoInvalido("Cerrada".to_string())),
            EstadoComanda::Anulada => Err(DomainError::ComandaEstadoInvalido("Anulada".to_string())),
        }
    }

    pub fn puede_transicionar_a(&self, nuevo: EstadoComanda) -> bool {
        match (self, nuevo) {
            (EstadoComanda::Borrador, EstadoComanda::Abierta) => true,
            (EstadoComanda::Abierta, EstadoComanda::Abierta) => true,
            (EstadoComanda::Abierta, EstadoComanda::Cerrada) => true,
            (EstadoComanda::Abierta, EstadoComanda::Anulada) => true,
            _ => false,
        }
    }
}

