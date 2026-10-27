use rusqlite::Connection;
use crate::domain::errors::DomainError;

pub fn ejecutar_migraciones(conn: &mut Connection) -> Result<(), DomainError> {
    let tx = conn.transaction()?;

    tx.execute_batch(
        "CREATE TABLE IF NOT EXISTS ubicaciones_referencia (
            id TEXT PRIMARY KEY,
            tipo TEXT NOT NULL CHECK(tipo IN ('Carpa', 'Sombrilla', 'Mesa', 'Reposera', 'Mostrador')),
            numero INTEGER NOT NULL,
            nombre TEXT NOT NULL,
            activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1))
        );

        CREATE TABLE IF NOT EXISTS productos_referencia (
            id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            categoria TEXT NOT NULL,
            precio_actual REAL NOT NULL CHECK(precio_actual >= 0),
            activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1))
        );

        CREATE TABLE IF NOT EXISTS comandas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo_visible TEXT NOT NULL UNIQUE,
            ubicacion_id TEXT NOT NULL,
            ubicacion_nombre TEXT NOT NULL,
            estado TEXT NOT NULL CHECK(estado IN ('Borrador', 'Abierta', 'Cerrada', 'Anulada')),
            total REAL NOT NULL DEFAULT 0.0 CHECK(total >= 0),
            creado_por TEXT NOT NULL,
            creado_en TEXT NOT NULL,
            cerrado_en TEXT,
            anulado_en TEXT,
            motivo_anulacion TEXT,
            anulado_por TEXT,
            token_idempotencia TEXT UNIQUE,
            FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones_referencia(id) ON UPDATE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_comandas_estado ON comandas(estado);
        CREATE INDEX IF NOT EXISTS idx_comandas_ubicacion ON comandas(ubicacion_id);
        CREATE INDEX IF NOT EXISTS idx_comandas_creado_en ON comandas(creado_en);

        CREATE TABLE IF NOT EXISTS items_comanda (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comanda_id INTEGER NOT NULL,
            producto_id TEXT NOT NULL,
            nombre_producto TEXT NOT NULL,
            cantidad INTEGER NOT NULL CHECK(cantidad > 0),
            precio_unitario REAL NOT NULL CHECK(precio_unitario >= 0),
            subtotal REAL NOT NULL CHECK(subtotal >= 0),
            observaciones TEXT,
            estado TEXT NOT NULL CHECK(estado IN ('Activo', 'Cancelado')) DEFAULT 'Activo',
            motivo_cancelacion TEXT,
            cancelado_en TEXT,
            cancelado_por TEXT,
            creado_en TEXT NOT NULL,
            FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE RESTRICT,
            FOREIGN KEY (producto_id) REFERENCES productos_referencia(id) ON UPDATE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_items_comanda_id ON items_comanda(comanda_id);

        CREATE TABLE IF NOT EXISTS auditoria_comandas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            comanda_id INTEGER NOT NULL,
            tipo_evento TEXT NOT NULL CHECK(tipo_evento IN (
                'CREACION', 
                'ADICION_ITEMS', 
                'CIERRE', 
                'ANULACION_COMANDA', 
                'CANCELACION_ITEM'
            )),
            descripcion TEXT NOT NULL,
            usuario TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            metadata_json TEXT,
            FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE RESTRICT
        );

        CREATE INDEX IF NOT EXISTS idx_auditoria_comanda_id ON auditoria_comandas(comanda_id);
        "
    )?;

    // Insertar datos semilla iniciales si las tablas de referencia están vacías
    let ubicaciones_count: i64 = tx.query_row(
        "SELECT COUNT(*) FROM ubicaciones_referencia;",
        [],
        |r| r.get(0),
    )?;

    if ubicaciones_count == 0 {
        tx.execute_batch(
            "INSERT INTO ubicaciones_referencia (id, tipo, numero, nombre, activo) VALUES
                ('carpa-01', 'Carpa', 1, 'Carpa 1', 1),
                ('carpa-12', 'Carpa', 12, 'Carpa 12', 1),
                ('carpa-14', 'Carpa', 14, 'Carpa 14', 1),
                ('sombrilla-04', 'Sombrilla', 4, 'Sombrilla 4', 1),
                ('sombrilla-08', 'Sombrilla', 8, 'Sombrilla 8', 1),
                ('mesa-01', 'Mesa', 1, 'Mesa 1', 1),
                ('mesa-03', 'Mesa', 3, 'Mesa 3', 1),
                ('mesa-04', 'Mesa', 4, 'Mesa 4', 1),
                ('reposera-05', 'Reposera', 5, 'Reposera 5', 1),
                ('mostrador-barra', 'Mostrador', 1, 'Barra Principal', 1);

            INSERT INTO productos_referencia (id, nombre, categoria, precio_actual, activo) VALUES
                ('licuado-frutilla', 'Licuado de Frutilla', 'Bebidas', 2500.00, 1),
                ('tostado-mixto', 'Tostado Mixto', 'Minutas', 3500.00, 1),
                ('cafe-cortado', 'Café Cortado', 'Cafetería', 1800.00, 1),
                ('agua-mineral', 'Agua Mineral 500ml', 'Bebidas', 1500.00, 1),
                ('rabas-porcion', 'Porción de Rabas', 'Minutas', 7500.00, 1),
                ('cerveza-artesanal', 'Cerveza Tirada 500cc', 'Bebidas', 3200.00, 1),
                ('medialuna-manteca', 'Medialuna de Manteca', 'Cafetería', 800.00, 1);
            "
        )?;
    }

    tx.commit()?;
    Ok(())
}

