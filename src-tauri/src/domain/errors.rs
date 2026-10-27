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

    #[error("No hay consumos o comandas pendientes por liquidar en esta ubicación.")]
    SinConsumosPendientes,

    #[error("Ya existe una cuenta abierta pendiente para esta ubicación.")]
    CuentaYaAbierta,

    #[error("No se encontró la cuenta solicitada.")]
    CuentaNoEncontrada,

    #[error("La cuenta ya se encuentra totalmente saldada y pagada.")]
    CuentaYaPagada,

    #[error("La cuenta ya se encuentra cerrada.")]
    CuentaYaCerrada,

    #[error("No se puede anular una cuenta con cobros activos; deben cancelarse los pagos primero.")]
    CuentaTienePagosActivos,

    #[error("El monto debe ser un importe positivo mayor a cero.")]
    MontoInvalido,

    #[error("El monto a imputar supera el saldo pendiente de la cuenta.")]
    MontoExcedeSaldo,

    #[error("No se encontró el registro de pago solicitado.")]
    PagoNoEncontrado,

    #[error("El pago ya fue cancelado previamente.")]
    PagoYaCancelado,

    #[error("No se puede cerrar la cuenta ni liberar la ubicación porque posee saldo pendiente impago.")]
    SaldoPendiente,

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
            DomainError::SinConsumosPendientes => "SIN_CONSUMOS_PENDIENTES",
            DomainError::CuentaYaAbierta => "CUENTA_YA_ABIERTA",
            DomainError::CuentaNoEncontrada => "CUENTA_NO_ENCONTRADA",
            DomainError::CuentaYaPagada => "CUENTA_YA_PAGADA",
            DomainError::CuentaYaCerrada => "CUENTA_YA_CERRADA",
            DomainError::CuentaTienePagosActivos => "CUENTA_TIENE_PAGOS_ACTIVOS",
            DomainError::MontoInvalido => "MONTO_INVALIDO",
            DomainError::MontoExcedeSaldo => "MONTO_EXCEDE_SALDO",
            DomainError::PagoNoEncontrado => "PAGO_NO_ENCONTRADO",
            DomainError::PagoYaCancelado => "PAGO_YA_CANCELADO",
            DomainError::SaldoPendiente => "SALDO_PENDIENTE",
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

