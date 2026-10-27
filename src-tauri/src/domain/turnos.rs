// src-tauri/src/domain/turnos.rs
// Modelos y lógica de negocio para Turnos de Caja, Arqueo Ciego y Sangrías (Feature 004)

use serde::{Deserialize, Serialize};
use super::errors::DomainError;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EstadoTurno {
    Abierto,
    Cerrado,
}

impl std::fmt::Display for EstadoTurno {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EstadoTurno::Abierto => write!(f, "Abierto"),
            EstadoTurno::Cerrado => write!(f, "Cerrado"),
        }
    }
}

impl std::str::FromStr for EstadoTurno {
    type Err = DomainError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "Abierto" => Ok(EstadoTurno::Abierto),
            "Cerrado" => Ok(EstadoTurno::Cerrado),
            _ => Err(DomainError::Validacion(format!("Estado de turno desconocido: {}", s))),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TurnoCaja {
    pub id: i64,
    pub codigo_visible: String,
    pub operador_apertura: String,
    pub fondo_inicial: f64,
    pub fecha_apertura: String,
    pub estado: EstadoTurno,
    pub operador_cierre: Option<String>,
    pub fecha_cierre: Option<String>,
    pub observaciones_cierre: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetiroCaja {
    pub id: i64,
    pub turno_id: i64,
    pub monto: f64,
    pub operador: String,
    pub receptor: String,
    pub motivo: String,
    pub creado_en: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArqueoCierre {
    pub id: i64,
    pub turno_id: i64,
    pub esperado_efectivo: f64,
    pub declarado_efectivo: f64,
    pub diferencia_efectivo: f64,
    pub esperado_debito: f64,
    pub declarado_debito: f64,
    pub diferencia_debito: f64,
    pub esperado_credito: f64,
    pub declarado_credito: f64,
    pub diferencia_credito: f64,
    pub esperado_transferencia: f64,
    pub declarado_transferencia: f64,
    pub diferencia_transferencia: f64,
    pub diferencia_total: f64,
    pub justificacion: Option<String>,
    pub creado_en: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumenMediosPagoTurno {
    pub efectivo: f64,
    pub debito: f64,
    pub credito: f64,
    pub transferencia: f64,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EstadoTurnoActual {
    pub turno_abierto: Option<TurnoCaja>,
    pub efectivo_en_gaveta: f64,
    pub total_cobrado_efectivo: f64,
    pub total_cobrado_debito: f64,
    pub total_cobrado_credito: f64,
    pub total_cobrado_transferencia: f64,
    pub total_recaudado: f64,
    pub total_retiros: f64,
    pub cantidad_cobros: i64,
    pub cantidad_retiros: i64,
    pub cuentas_abiertas_pendientes: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DetalleTurnoCompleto {
    pub turno: TurnoCaja,
    pub arqueo: Option<ArqueoCierre>,
    pub retiros: Vec<RetiroCaja>,
    pub resumen_medios_pago: ResumenMediosPagoTurno,
}

impl TurnoCaja {
    pub fn abrir(
        codigo_visible: String,
        operador: String,
        fondo_inicial: f64,
        timestamp: String,
    ) -> Result<Self, DomainError> {
        if operador.trim().is_empty() {
            return Err(DomainError::Validacion("El operador de apertura es obligatorio.".to_string()));
        }
        if fondo_inicial < 0.0 {
            return Err(DomainError::FondoInicialInvalido);
        }

        let fondo_redondeado = (fondo_inicial * 100.0).round() / 100.0;

        Ok(Self {
            id: 0,
            codigo_visible,
            operador_apertura: operador.trim().to_string(),
            fondo_inicial: fondo_redondeado,
            fecha_apertura: timestamp,
            estado: EstadoTurno::Abierto,
            operador_cierre: None,
            fecha_cierre: None,
            observaciones_cierre: None,
        })
    }

    pub fn cerrar(
        &mut self,
        operador: &str,
        observaciones: Option<String>,
        timestamp: &str,
    ) -> Result<(), DomainError> {
        if self.estado == EstadoTurno::Cerrado {
            return Err(DomainError::TurnoYaCerrado);
        }
        self.estado = EstadoTurno::Cerrado;
        self.operador_cierre = Some(operador.trim().to_string());
        self.fecha_cierre = Some(timestamp.to_string());
        self.observaciones_cierre = observaciones.map(|o| o.trim().to_string()).filter(|o| !o.is_empty());
        Ok(())
    }
}

impl RetiroCaja {
    pub fn nuevo(
        turno_id: i64,
        monto: f64,
        operador: &str,
        receptor: &str,
        motivo: &str,
        efectivo_disponible: f64,
        timestamp: String,
    ) -> Result<Self, DomainError> {
        if monto <= 0.0 {
            return Err(DomainError::MontoInvalido);
        }
        if operador.trim().is_empty() {
            return Err(DomainError::Validacion("Debe indicar el operador que entrega el dinero.".to_string()));
        }
        if receptor.trim().is_empty() {
            return Err(DomainError::Validacion("Debe indicar el receptor del dinero retirado.".to_string()));
        }
        if motivo.trim().len() < 4 {
            return Err(DomainError::MotivoRequerido);
        }

        let monto_redondeado = (monto * 100.0).round() / 100.0;
        let efectivo_disponible_redondeado = (efectivo_disponible * 100.0).round() / 100.0;

        if monto_redondeado > efectivo_disponible_redondeado + 0.01 {
            return Err(DomainError::SaldoInsuficienteEnGaveta);
        }

        Ok(Self {
            id: 0,
            turno_id,
            monto: monto_redondeado,
            operador: operador.trim().to_string(),
            receptor: receptor.trim().to_string(),
            motivo: motivo.trim().to_string(),
            creado_en: timestamp,
        })
    }
}

impl ArqueoCierre {
    pub fn calcular(
        turno_id: i64,
        esperado_efectivo: f64,
        declarado_efectivo: f64,
        esperado_debito: f64,
        declarado_debito: f64,
        esperado_credito: f64,
        declarado_credito: f64,
        esperado_transferencia: f64,
        declarado_transferencia: f64,
        justificacion: Option<String>,
        timestamp: String,
    ) -> Result<Self, DomainError> {
        if declarado_efectivo < 0.0 {
            return Err(DomainError::Validacion("El efectivo declarado no puede ser negativo.".to_string()));
        }

        let esp_ef = (esperado_efectivo * 100.0).round() / 100.0;
        let dec_ef = (declarado_efectivo * 100.0).round() / 100.0;
        let dif_ef = ((dec_ef - esp_ef) * 100.0).round() / 100.0;

        let esp_deb = (esperado_debito * 100.0).round() / 100.0;
        let dec_deb = (declarado_debito * 100.0).round() / 100.0;
        let dif_deb = ((dec_deb - esp_deb) * 100.0).round() / 100.0;

        let esp_cre = (esperado_credito * 100.0).round() / 100.0;
        let dec_cre = (declarado_credito * 100.0).round() / 100.0;
        let dif_cre = ((dec_cre - esp_cre) * 100.0).round() / 100.0;

        let esp_tra = (esperado_transferencia * 100.0).round() / 100.0;
        let dec_tra = (declarado_transferencia * 100.0).round() / 100.0;
        let dif_tra = ((dec_tra - esp_tra) * 100.0).round() / 100.0;

        let dif_total = ((dif_ef + dif_deb + dif_cre + dif_tra) * 100.0).round() / 100.0;

        // Validación FR-008: si |dif_ef| > 1000, exigir justificación obligatoria
        let justificacion_limpia = justificacion.map(|j| j.trim().to_string()).filter(|j| !j.is_empty());
        if dif_ef.abs() > 1000.0 && justificacion_limpia.is_none() {
            return Err(DomainError::JustificacionRequerida);
        }

        Ok(Self {
            id: 0,
            turno_id,
            esperado_efectivo: esp_ef,
            declarado_efectivo: dec_ef,
            diferencia_efectivo: dif_ef,
            esperado_debito: esp_deb,
            declarado_debito: dec_deb,
            diferencia_debito: dif_deb,
            esperado_credito: esp_cre,
            declarado_credito: dec_cre,
            diferencia_credito: dif_cre,
            esperado_transferencia: esp_tra,
            declarado_transferencia: dec_tra,
            diferencia_transferencia: dif_tra,
            diferencia_total: dif_total,
            justificacion: justificacion_limpia,
            creado_en: timestamp,
        })
    }
}

pub fn generar_ticket_80mm(detalle: &DetalleTurnoCompleto) -> String {
    let t = &detalle.turno;
    let r = &detalle.resumen_medios_pago;
    let arq = &detalle.arqueo;

    let sep_doble = "=".repeat(48);
    let sep_simple = "-".repeat(48);

    let mut s = String::new();
    s.push_str(&format!("{}\n", sep_doble));
    s.push_str("          BALNEARIO - CIERRE DE TURNO           \n");
    s.push_str(&format!("{}\n", sep_doble));
    s.push_str(&format!("Turno: {:<18} Estado: {:<10}\n", t.codigo_visible, t.estado.to_string().to_uppercase()));
    s.push_str(&format!("Cajero Apertura: {:<30}\n", t.operador_apertura));
    s.push_str(&format!("Inicio: {:<38}\n", t.fecha_apertura));
    if let Some(ref fc) = t.fecha_cierre {
        s.push_str(&format!("Cierre: {:<38}\n", fc));
    }
    if let Some(ref oc) = t.operador_cierre {
        s.push_str(&format!("Cajero Cierre:   {:<30}\n", oc));
    }
    s.push_str(&format!("{}\n", sep_simple));
    s.push_str("RECAUDACIÓN POR MEDIO DE COBRO:\n");
    s.push_str(&format!("  Efectivo:                   ${:>14.2}\n", r.efectivo));
    s.push_str(&format!("  Tarjeta Débito:             ${:>14.2}\n", r.debito));
    s.push_str(&format!("  Tarjeta Crédito:            ${:>14.2}\n", r.credito));
    s.push_str(&format!("  Transferencia / QR:         ${:>14.2}\n", r.transferencia));
    s.push_str(&format!("{}\n", sep_simple));
    s.push_str(&format!("TOTAL COBRADO EN TURNO:       ${:>14.2}\n", r.total));
    s.push_str(&format!("{}\n", sep_simple));
    s.push_str("MOVIMIENTO DE EFECTIVO EN GAVETA:\n");
    s.push_str(&format!("  (+) Fondo Inicial:          ${:>14.2}\n", t.fondo_inicial));
    s.push_str(&format!("  (+) Cobros en Efectivo:     ${:>14.2}\n", r.efectivo));

    let total_retiros: f64 = detalle.retiros.iter().map(|ret| ret.monto).sum();
    s.push_str(&format!("  (-) Retiros / Sangrías ({}): -${:>13.2}\n", detalle.retiros.len(), total_retiros));

    if let Some(a) = arq {
        s.push_str(&format!("{}\n", sep_simple));
        s.push_str(&format!("EFECTIVO TEÓRICO ESPERADO:    ${:>14.2}\n", a.esperado_efectivo));
        s.push_str(&format!("EFECTIVO REAL DECLARADO:      ${:>14.2}\n", a.declarado_efectivo));
        s.push_str(&format!("{}\n", sep_simple));

        let res_str = if a.diferencia_efectivo == 0.0 {
            "EXACTO (0.00)"
        } else if a.diferencia_efectivo > 0.0 {
            "SOBRANTE (+)"
        } else {
            "FALTANTE (-)"
        };

        s.push_str(&format!("RESULTADO ARQUEO EFECTIVO:    ${:>14.2} ({})\n", a.diferencia_efectivo, res_str));

        if let Some(ref j) = a.justificacion {
            s.push_str(&format!("Justificación: {}\n", j));
        }
    }

    s.push_str(&format!("{}\n\n", sep_doble));
    s.push_str("Firma Cajero:    ___________________________\n\n");
    s.push_str("Firma Supervisor: ___________________________\n");
    s.push_str(&format!("{}\n", sep_doble));
    s
}
