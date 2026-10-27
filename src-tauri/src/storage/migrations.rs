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
            disponible_para_venta INTEGER NOT NULL DEFAULT 1 CHECK(disponible_para_venta IN (0, 1)),
            descripcion TEXT,
            activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1)),
            creado_en TEXT NOT NULL DEFAULT '2026-01-01T00:00:00Z',
            actualizado_en TEXT NOT NULL DEFAULT '2026-01-01T00:00:00Z'
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

        -- Tablas Feature 002: Gestión de Cuentas y Pagos
        CREATE TABLE IF NOT EXISTS cuentas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo_visible TEXT NOT NULL UNIQUE,
            ubicacion_id TEXT NOT NULL,
            ubicacion_nombre TEXT NOT NULL,
            estado TEXT NOT NULL CHECK(estado IN ('Abierta', 'Pagada', 'Cerrada', 'Anulada')),
            total REAL NOT NULL DEFAULT 0.0 CHECK(total >= 0),
            saldo_pendiente REAL NOT NULL DEFAULT 0.0 CHECK(saldo_pendiente >= 0),
            creado_por TEXT NOT NULL,
            creado_en TEXT NOT NULL,
            cerrado_en TEXT,
            anulado_en TEXT,
            motivo_anulacion TEXT,
            anulado_por TEXT,
            FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones_referencia(id) ON UPDATE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_cuentas_estado ON cuentas(estado);
        CREATE INDEX IF NOT EXISTS idx_cuentas_ubicacion ON cuentas(ubicacion_id);

        CREATE TABLE IF NOT EXISTS cuenta_comandas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cuenta_id INTEGER NOT NULL,
            comanda_id INTEGER NOT NULL,
            total_comanda REAL NOT NULL CHECK(total_comanda >= 0),
            agregado_en TEXT NOT NULL,
            FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE RESTRICT,
            FOREIGN KEY (comanda_id) REFERENCES comandas(id) ON DELETE RESTRICT,
            UNIQUE (cuenta_id, comanda_id)
        );

        CREATE INDEX IF NOT EXISTS idx_cuenta_comandas_cuenta_id ON cuenta_comandas(cuenta_id);
        CREATE INDEX IF NOT EXISTS idx_cuenta_comandas_comanda_id ON cuenta_comandas(comanda_id);

        CREATE TABLE IF NOT EXISTS pagos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cuenta_id INTEGER NOT NULL,
            medio_pago TEXT NOT NULL CHECK(medio_pago IN ('Efectivo', 'Tarjeta Débito', 'Tarjeta Crédito', 'Transferencia')),
            monto REAL NOT NULL CHECK(monto > 0),
            monto_entregado REAL CHECK(monto_entregado >= 0),
            vuelto REAL CHECK(vuelto >= 0),
            referencia_externa TEXT,
            estado TEXT NOT NULL CHECK(estado IN ('Activo', 'Cancelado')) DEFAULT 'Activo',
            motivo_anulacion TEXT,
            cancelado_en TEXT,
            cancelado_por TEXT,
            creado_por TEXT NOT NULL,
            creado_en TEXT NOT NULL,
            token_idempotencia TEXT UNIQUE,
            FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE RESTRICT
        );

        CREATE INDEX IF NOT EXISTS idx_pagos_cuenta_id ON pagos(cuenta_id);
        CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);
        CREATE INDEX IF NOT EXISTS idx_pagos_medio_pago ON pagos(medio_pago);

        CREATE TABLE IF NOT EXISTS auditoria_pagos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cuenta_id INTEGER NOT NULL,
            pago_id INTEGER,
            tipo_evento TEXT NOT NULL CHECK(tipo_evento IN (
                'APERTURA_CUENTA',
                'PAGO_REGISTRADO',
                'PAGO_ANULADO',
                'CIERRE_CUENTA',
                'ANULACION_CUENTA'
            )),
            descripcion TEXT NOT NULL,
            usuario TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            metadata_json TEXT,
            FOREIGN KEY (cuenta_id) REFERENCES cuentas(id) ON DELETE RESTRICT
        );

        CREATE INDEX IF NOT EXISTS idx_auditoria_pagos_cuenta_id ON auditoria_pagos(cuenta_id);

        -- Tablas Feature 003: Gestión de Catálogo de Productos y Precios
        CREATE TABLE IF NOT EXISTS categorias_referencia (
            id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            icono TEXT,
            orden INTEGER NOT NULL DEFAULT 0,
            activo INTEGER NOT NULL DEFAULT 1 CHECK(activo IN (0, 1))
        );

        CREATE TABLE IF NOT EXISTS historial_precios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            producto_id TEXT NOT NULL,
            precio_anterior REAL NOT NULL CHECK(precio_anterior >= 0),
            precio_nuevo REAL NOT NULL CHECK(precio_nuevo > 0),
            fecha_cambio TEXT NOT NULL,
            usuario TEXT NOT NULL,
            motivo TEXT,
            FOREIGN KEY (producto_id) REFERENCES productos_referencia(id) ON UPDATE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_historial_precios_producto ON historial_precios(producto_id);
        CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos_referencia(categoria);
        CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos_referencia(activo);

        -- Tablas Feature 004: Gestión de Turnos de Caja, Arqueo Ciego y Sangrías
        CREATE TABLE IF NOT EXISTS turnos_caja (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo_visible TEXT NOT NULL UNIQUE,
            operador_apertura TEXT NOT NULL,
            fondo_inicial REAL NOT NULL CHECK(fondo_inicial >= 0),
            fecha_apertura TEXT NOT NULL,
            estado TEXT NOT NULL CHECK(estado IN ('Abierto', 'Cerrado')),
            operador_cierre TEXT,
            fecha_cierre TEXT,
            observaciones_cierre TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos_caja(estado);
        CREATE INDEX IF NOT EXISTS idx_turnos_fecha_apertura ON turnos_caja(fecha_apertura);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_un_solo_turno_abierto ON turnos_caja(estado) WHERE estado = 'Abierto';

        CREATE TABLE IF NOT EXISTS retiros_caja (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            turno_id INTEGER NOT NULL,
            monto REAL NOT NULL CHECK(monto > 0),
            operador TEXT NOT NULL,
            receptor TEXT NOT NULL,
            motivo TEXT NOT NULL,
            creado_en TEXT NOT NULL,
            FOREIGN KEY (turno_id) REFERENCES turnos_caja(id) ON DELETE RESTRICT
        );

        CREATE INDEX IF NOT EXISTS idx_retiros_turno_id ON retiros_caja(turno_id);
        CREATE INDEX IF NOT EXISTS idx_retiros_creado_en ON retiros_caja(creado_en);

        CREATE TABLE IF NOT EXISTS arqueos_cierre (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            turno_id INTEGER NOT NULL UNIQUE,
            esperado_efectivo REAL NOT NULL,
            declarado_efectivo REAL NOT NULL CHECK(declarado_efectivo >= 0),
            diferencia_efectivo REAL NOT NULL,
            esperado_debito REAL NOT NULL,
            declarado_debito REAL NOT NULL CHECK(declarado_debito >= 0),
            diferencia_debito REAL NOT NULL,
            esperado_credito REAL NOT NULL,
            declarado_credito REAL NOT NULL CHECK(declarado_credito >= 0),
            diferencia_credito REAL NOT NULL,
            esperado_transferencia REAL NOT NULL,
            declarado_transferencia REAL NOT NULL CHECK(declarado_transferencia >= 0),
            diferencia_transferencia REAL NOT NULL,
            diferencia_total REAL NOT NULL,
            justificacion TEXT,
            creado_en TEXT NOT NULL,
            FOREIGN KEY (turno_id) REFERENCES turnos_caja(id) ON DELETE RESTRICT
        );

        CREATE INDEX IF NOT EXISTS idx_arqueos_turno_id ON arqueos_cierre(turno_id);
        "
    )?;

    // Migración aditiva para productos_referencia
    let prod_columns: Vec<String> = {
        let mut stmt = tx.prepare("PRAGMA table_info(productos_referencia);")?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(1))?;
        let mut list = Vec::new();
        for r in rows {
            if let Ok(c) = r {
                list.push(c);
            }
        }
        list
    };

    if !prod_columns.contains(&"disponible_para_venta".to_string()) {
        tx.execute("ALTER TABLE productos_referencia ADD COLUMN disponible_para_venta INTEGER NOT NULL DEFAULT 1 CHECK(disponible_para_venta IN (0, 1));", [])?;
    }
    if !prod_columns.contains(&"descripcion".to_string()) {
        tx.execute("ALTER TABLE productos_referencia ADD COLUMN descripcion TEXT;", [])?;
    }
    if !prod_columns.contains(&"creado_en".to_string()) {
        tx.execute("ALTER TABLE productos_referencia ADD COLUMN creado_en TEXT NOT NULL DEFAULT '2026-01-01T00:00:00Z';", [])?;
    }
    if !prod_columns.contains(&"actualizado_en".to_string()) {
        tx.execute("ALTER TABLE productos_referencia ADD COLUMN actualizado_en TEXT NOT NULL DEFAULT '2026-01-01T00:00:00Z';", [])?;
    }

    // Migración aditiva para pagos (agregar turno_id si no existe)
    let pagos_columns: Vec<String> = {
        let mut stmt = tx.prepare("PRAGMA table_info(pagos);")?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(1))?;
        let mut list = Vec::new();
        for r in rows {
            if let Ok(c) = r {
                list.push(c);
            }
        }
        list
    };

    if !pagos_columns.contains(&"turno_id".to_string()) {
        tx.execute("ALTER TABLE pagos ADD COLUMN turno_id INTEGER REFERENCES turnos_caja(id) ON DELETE RESTRICT;", [])?;
        tx.execute("CREATE INDEX IF NOT EXISTS idx_pagos_turno_id ON pagos(turno_id);", [])?;
    }

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
            "
        )?;
    }

    let categorias_count: i64 = tx.query_row(
        "SELECT COUNT(*) FROM categorias_referencia;",
        [],
        |r| r.get(0),
    )?;

    if categorias_count == 0 {
        tx.execute_batch(
            "INSERT INTO categorias_referencia (id, nombre, icono, orden, activo) VALUES
                ('bebidas', 'Bebidas', 'GlassWater', 1, 1),
                ('minutas', 'Minutas', 'UtensilsCrossed', 2, 1),
                ('cafeteria', 'Cafetería', 'Coffee', 3, 1),
                ('postres', 'Postres', 'IceCream', 4, 1),
                ('kiosco', 'Kiosco', 'Candy', 5, 1);
            "
        )?;
    }

    let productos_count: i64 = tx.query_row(
        "SELECT COUNT(*) FROM productos_referencia;",
        [],
        |r| r.get(0),
    )?;

    if productos_count == 0 {
        tx.execute_batch(
            "INSERT INTO productos_referencia (id, nombre, categoria, precio_actual, disponible_para_venta, descripcion, activo, creado_en, actualizado_en) VALUES
                ('licuado-frutilla', 'Licuado de Frutilla', 'Bebidas', 2500.00, 1, 'Licuado al agua o con leche de frutillas frescas', 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
                ('tostado-mixto', 'Tostado Mixto', 'Minutas', 3500.00, 1, 'Tostado de jamón cocido y queso en pan de miga', 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
                ('cafe-cortado', 'Café Cortado', 'Cafetería', 1800.00, 1, 'Café espresso con un toque de leche espumada', 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
                ('agua-mineral', 'Agua Mineral 500ml', 'Bebidas', 1500.00, 1, 'Agua mineral con o sin gas', 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
                ('rabas-porcion', 'Porción de Rabas', 'Minutas', 7500.00, 1, 'Porción de rabas crocantes con limón', 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
                ('cerveza-artesanal', 'Cerveza Tirada 500cc', 'Bebidas', 3200.00, 1, 'Cerveza rubia Golden artesanal tirada', 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'),
                ('medialuna-manteca', 'Medialuna de Manteca', 'Cafetería', 800.00, 1, 'Medialuna de manteca tradicional de la costa', 1, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z');
            "
        )?;
    }

    tx.commit()?;
    Ok(())
}
