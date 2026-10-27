// src-tauri/src/domain/cuentas.rs
// Entidad Cuenta y reglas de negocio contables (Feature 002)

use serde::{Deserialize, Serialize};
use super::errors::DomainError;
use super::pagos::Pago;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum EstadoCuenta {
    #[serde(rename = "Abierta")]
    Abierta,
    #[serde(rename = "Pagada")]
    Pagada,
    #[serde(rename = "Cerrada")]
    Cerrada,
    #[serde(rename = "Anulada")]
    Anulada,
}

impl std::fmt::Display for EstadoCuenta {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EstadoCuenta::Abierta => write!(f, "Abierta"),
            EstadoCuenta::Pagada => write!(f, "Pagada"),
            EstadoCuenta::Cerrada => write!(f, "Cerrada"),
            EstadoCuenta::Anulada => write!(f, "Anulada"),
        }
    }
}

impl std::str::FromStr for EstadoCuenta {
    type Err = DomainError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Abierta" => Ok(EstadoCuenta::Abierta),
            "Pagada" => Ok(EstadoCuenta::Pagada),
            "Cerrada" => Ok(EstadoCuenta::Cerrada),
            "Anulada" => Ok(EstadoCuenta::Anulada),
            _ => Err(DomainError::Validacion(format!("Estado de cuenta desconocido: {}", s))),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComandaEnCuenta {
    pub comanda_id: i64,
    pub codigo_visible: String,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Cuenta {
    pub id: i64,
    pub codigo_visible: String,
    pub ubicacion_id: String,
    pub ubicacion_nombre: String,
    pub estado: EstadoCuenta,
    pub total: f64,
    pub saldo_pendiente: f64,
    pub creado_por: String,
    pub creado_en: String,
    pub cerrado_en: Option<String>,
    pub anulado_en: Option<String>,
    pub motivo_anulacion: Option<String>,
    pub anulado_por: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CuentaDetallada {
    #[serde(flatten)]
    pub cuenta: Cuenta,
    pub comandas_asociadas: Vec<ComandaEnCuenta>,
    pub pagos: Vec<Pago>,
}

impl Cuenta {
    pub fn new(
        id: i64,
        codigo_visible: String,
        ubicacion_id: String,
        ubicacion_nombre: String,
        total: f64,
        creado_por: String,
        creado_en: String,
    ) -> Result<Self, DomainError> {
        if total <= 0.0 {
            return Err(DomainError::Validacion(
                "El total de la cuenta a abrir debe ser mayor a cero.".to_string(),
            ));
        }

        Ok(Self {
            id,
            codigo_visible,
            ubicacion_id,
            ubicacion_nombre,
            estado: EstadoCuenta::Abierta,
            total,
            saldo_pendiente: total,
            creado_por,
            creado_en,
            cerrado_en: None,
            anulado_en: None,
            motivo_anulacion: None,
            anulado_por: None,
        })
    }

    /// Recalcula el saldo pendiente a partir de los pagos activos
    pub fn recalcular_saldo(&mut self, pagos: &[Pago]) {
        let total_pagos_activos: f64 = pagos
            .iter()
            .filter(|p| p.estado == super::pagos::EstadoPago::Activo)
            .map(|p| p.monto)
            .sum();

        let saldo = self.total - total_pagos_activos;
        self.saldo_pendiente = if saldo.abs() < 0.001 {
            0.0
        } else {
            (saldo * 100.0).round() / 100.0
        };

        if self.estado == EstadoCuenta::Abierta && self.saldo_pendiente <= 0.0 {
            self.estado = EstadoCuenta::Pagada;
        } else if self.estado == EstadoCuenta::Pagada && self.saldo_pendiente > 0.0 {
            self.estado = EstadoCuenta::Abierta;
        }
    }

    /// Valida que la cuenta no tenga saldo antes de permitir el cierre y liberación
    pub fn validar_cierre(&self) -> Result<(), DomainError> {
        if self.estado == EstadoCuenta::Cerrada {
            return Err(DomainError::CuentaYaCerrada);
        }
        if self.saldo_pendiente > 0.001 {
            return Err(DomainError::SaldoPendiente);
        }
        Ok(())
    }

    /// Valida la posibilidad de anular administrativamente la cuenta
    pub fn validar_anulacion(
        &self,
        tiene_pagos_activos: bool,
        motivo: &str,
    ) -> Result<(), DomainError> {
        if self.estado == EstadoCuenta::Cerrada {
            return Err(DomainError::CuentaYaCerrada);
        }
        if tiene_pagos_activos {
            return Err(DomainError::CuentaTienePagosActivos);
        }
        if motivo.trim().chars().count() < 4 {
            return Err(DomainError::MotivoRequerido);
        }
        Ok(())
    }

    /// Algoritmo de división equitativa en N partes con ajuste de residuo en la última cuota
    pub fn calcular_division(saldo: f64, partes: usize) -> Result<Vec<f64>, DomainError> {
        if partes < 2 {
            return Err(DomainError::Validacion(
                "La división de la cuenta requiere al menos 2 partes.".to_string(),
            ));
        }
        if saldo <= 0.0 {
            return Err(DomainError::Validacion(
                "El saldo a dividir debe ser mayor a cero.".to_string(),
            ));
        }

        let base_cents = ((saldo / partes as f64) * 100.0).floor() as i64;
        let mut cuotas = Vec::with_capacity(partes);
        let mut suma_acumulada_cents = 0i64;

        for i in 0..partes {
            if i == partes - 1 {
                let total_cents = (saldo * 100.0).round() as i64;
                let ultima_cuota_cents = total_cents - suma_acumulada_cents;
                cuotas.push(ultima_cuota_cents as f64 / 100.0);
            } else {
                cuotas.push(base_cents as f64 / 100.0);
                suma_acumulada_cents += base_cents;
            }
        }

        Ok(cuotas)
    }
}

