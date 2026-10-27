use std::path::{Path, PathBuf};
use rusqlite::Connection;
use crate::domain::errors::DomainError;
use crate::storage::migrations::ejecutar_migraciones;

pub struct DatabaseManager {
    db_path: PathBuf,
}

impl DatabaseManager {
    pub fn new<P: AsRef<Path>>(path: P) -> Self {
        Self {
            db_path: path.as_ref().to_path_buf(),
        }
    }

    /// Abre una conexión a SQLite y activa rigurosamente el modo WAL, claves foráneas y chequeos de resiliencia
    pub fn conectar(&self) -> Result<Connection, DomainError> {
        if let Some(parent) = self.db_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).map_err(|e| {
                    DomainError::ErrorAlmacenamiento(format!("No se pudo crear directorio de base de datos: {}", e))
                })?;
            }
        }

        let conn = Connection::open(&self.db_path)
            .map_err(|e| DomainError::ErrorAlmacenamiento(format!("Fallo al abrir SQLite: {}", e)))?;

        // Configuración fundamental de resiliencia según Constitución Artículo IV
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA busy_timeout = 5000;"
        ).map_err(|e| DomainError::ErrorAlmacenamiento(format!("Error aplicando PRAGMAs de SQLite: {}", e)))?;

        Ok(conn)
    }

    /// Inicializa la base de datos aplicando migraciones y verificando integridad
    pub fn inicializar(&self) -> Result<(), DomainError> {
        let mut conn = self.conectar()?;
        
        // Verificación de integridad inicial
        self.verificar_integridad(&conn)?;

        // Ejecución de migraciones DDL
        ejecutar_migraciones(&mut conn)?;

        Ok(())
    }

    /// Ejecuta PRAGMA integrity_check para validar el estado tras posibles cierres abruptos
    pub fn verificar_integridad(&self, conn: &Connection) -> Result<(), DomainError> {
        let mut stmt = conn.prepare("PRAGMA integrity_check;")?;
        let mut rows = stmt.query([])?;
        
        if let Some(row) = rows.next()? {
            let resultado: String = row.get(0)?;
            if resultado != "ok" {
                return Err(DomainError::ErrorAlmacenamiento(format!(
                    "Fallo de integridad en SQLite: {}",
                    resultado
                )));
            }
        }
        Ok(())
    }

    pub fn conexion_memoria() -> Result<Connection, DomainError> {
        let conn = Connection::open_in_memory()
            .map_err(|e| DomainError::ErrorAlmacenamiento(e.to_string()))?;
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA busy_timeout = 5000;"
        )?;
        ejecutar_migraciones(&mut {conn})
    }
}

