// src-tauri/src/domain/pagos.rs
// Entidad Pago, medios de pago y arqueo de caja (Feature 002)

use serde::{Deserialize, Serialize};
use super::errors::DomainError;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum MedioPago {
    #[serde(rename = "Efectivo")]
    Efectivo,
    #[serde(rename = "Tarjeta Débito")]
    TarjetaDebito,
    #[serde(rename = "Tarjeta Crédito")]
    TarjetaCredito,
    #[serde(rename = "Transferencia")]
    Transferencia,
}

impl std::fmt::Display for MedioPago {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MedioPago::Efectivo => write!(f, "Efectivo"),
            MedioPago::TarjetaDebito => write!(f, "Tarjeta Débito"),
            MedioPago::TarjetaCredito => write!(f, "Tarjeta Crédito"),
            MedioPago::Transferencia => write!(f, "Transferencia"),
        }
    }
}

impl std::str::FromStr for MedioPago {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Efectivo" => Ok(MedioPago::Efectivo),
            "Tarjeta Débito" | "TarjetaDebito" => Ok(MedioPago::TarjetaDebito),
            "Tarjeta Crédito" | "TarjetaCredito" => Ok(MedioPago::TarjetaCredito),
            "Transferencia" => Ok(MedioPago::Transferencia),
            _ => Err(DomainError::Validacion(format!("Medio de pago desconocido: {}", s))),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum EstadoPago {
    #[serde(rename = "Activo")]
    Activo,
    #[serde(rename = "Cancelado")]
    Cancelado,
}

impl std::fmt::Display for EstadoPago {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EstadoPago::Activo => write!(f, "Activo"),
            EstadoPago::Cancelado => write!(f, "Cancelado"),
        }
    }
}

impl std::str::FromStr for EstadoPago {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Activo" => Ok(EstadoPago::Activo),
            "Cancelado" => Ok(EstadoPago::Cancelado),
            _ => Err(DomainError::Validacion(format!("Estado de pago desconocido: {}", s))),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pago {
    pub id: i64,
    pub cuenta_id: i64,
    pub medio_pago: MedioPago,
    pub monto: f64,
    pub monto_entregado: Option<f64>,
    pub vuelto: Option<f64>,
    pub referencia_externa: Option<String>,
    pub estado: EstadoPago,
    pub motivo_anulacion: Option<String>,
    pub cancelado_por: Option<String>,
    pub cancelado_en: Option<String>,
    pub creado_por: String,
    pub creado_en: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ResumenArqueo {
    pub total_efectivo: f64,
    pub total_debito: f64,
    pub total_credito: f64,
    pub total_transferencia: f64,
    pub total_recaudado: f64,
    pub cantidad_pagos_activos: usize,
    pub cantidad_pagos_anulados: usize,
}

impl Pago {
    pub fn new(
        id: i64,
        cuenta_id: i64,
        medio_pago: MedioPago,
        monto: f64,
        monto_entregado: Option<f64>,
        referencia_externa: Option<String>,
        operador: String,
        creado_en: String,
        saldo_pendiente_actual: f64,
    ) -> Result<Self, DomainError> {
        if monto <= 0.0 {
            return Err(DomainError::MontoInvalido);
        }
        if monto > (saldo_pendiente_actual + 0.001) {
            return Err(DomainError::MontoExcedeSaldo);
        }

        let vuelto = match medio_pago {
            MedioPago::Efectivo => {
                if let Some(entregado) = monto_entregado {
                    if entregado < (monto - 0.001) {
                        return Err(DomainError::Validacion(
                            "El importe entregado en efectivo no puede ser menor al monto a pagar.".to_string(),
                        ));
                    }
                    Some(((entregado - monto) * 100.0).round() / 100.0)
                } else {
                    Some(0.0)
                }
            }
            _ => None,
        };

        Ok(Self {
            id,
            cuenta_id,
            medio_pago,
            monto: (monto * 100.0).round() / 100.0,
            monto_entregado,
            vuelto,
            referencia_externa,
            estado: EstadoPago::Activo,
            motivo_anulacion: None,
            cancelado_por: None,
            cancelado_en: None,
            creado_por: operador,
            creado_en,
        })
    }

    pub fn anular(&mut self, motivo: &str, operador: &str, timestamp: &str) -> Result<(), DomainError> {
        if self.estado == EstadoPago::Cancelado {
            return Err(DomainError::PagoYaCancelado);
        }
        if motivo.trim().chars().count() < 4 {
            return Err(DomainError::MotivoRequerido);
        }

        self.estado = EstadoPago::Cancelado;
        self.motivo_anulacion = Some(motivo.trim().to_string());
        self.cancelado_por = Some(operador.to_string());
        self.cancelado_en = Some(timestamp.to_string());
        Ok(())
    }
}

