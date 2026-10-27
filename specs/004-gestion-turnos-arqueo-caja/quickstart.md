# Quickstart & Verification Guide: Gestión de Turnos de Caja y Arqueo Ciego

**Feature**: `004-gestion-turnos-arqueo-caja`  
**Purpose**: Guía de verificación paso a paso de los escenarios de aceptación y validación integral.

---

## Escenario 1: Apertura de Turno con Fondo Inicial de Cambio
1. Acceder al panel de **Cuentas y Caja** o pestaña **Turnos de Caja**.
2. Observar el estado inicial: **"Caja Cerrada - Sin Turno Activo"**.
3. Pulsar **"Abrir Turno de Caja"**.
4. Completar:
   - Operador: `cajero_playa_1`
   - Fondo inicial en efectivo: `$20.000`
5. Confirmar la apertura.
6. **Verificación**: El sistema muestra el turno como **"TRN-20261027-01 (Abierto)"** con `$20.000` disponibles en gaveta.

---

## Escenario 2: Cobros durante el Turno y Acumulación en Gaveta
1. Abrir una cuenta en `Carpa 12` por `$8.500`.
2. Registrar un cobro en **Efectivo** por `$8.500` (monto entregado `$10.000`, vuelto `$1.500`).
3. Abrir otra cuenta en `Mesa 3` por `$6.000`.
4. Registrar un cobro con **Tarjeta Débito** por `$6.000`.
5. **Verificación**:
   - Efectivo neto en gaveta: `$20.000 + $8.500 = $28.500`.
   - Total recaudado en turno: `$14.500` (Efectivo: `$8.500`, Débito: `$6.000`).
   - Los cobros quedan asociados con `turno_id = 1`.

---

## Escenario 3: Retiro Parcial de Efectivo (Sangría a Caja Fuerte)
1. Con `$28.500` en gaveta, el encargado decide retirar `$15.000` por seguridad.
2. Pulsar **"Registrar Retiro / Sangría"**.
3. Ingresar:
   - Monto: `$15.000`
   - Receptor: `tesorero_luis`
   - Motivo: `Excedente de caja tarde`
4. Confirmar el retiro.
5. **Verificación**:
   - El saldo en gaveta desciende a `$13.500` (`$28.500 - $15.000`).
   - Si se intentara retirar `$20.000` adicionales, el sistema bloquearía la operación por saldo insuficiente.

---

## Escenario 4: Arqueo Ciego de Cierre y Cálculo de Diferencia
1. El cajero finaliza su jornada y pulsa **"Cerrar Turno (Arqueo Ciego)"**.
2. La pantalla oculta los totales del sistema y solicita el conteo físico del dinero:
   - Efectivo contado en billetes: `$13.200`
   - Cupones de Débito: `$6.000`
   - Cupones de Crédito: `$0`
   - Transferencias: `$0`
3. Al pulsar **"Calcular Conciliación"**, el sistema compara:
   - Efectivo teórico esperado: `$13.500`
   - Efectivo declarado: `$13.200`
   - Diferencia: `-$300` (**Faltante de Caja**).
4. El cajero ingresa la justificación: `Diferencia de monedas en cambio`.
5. Confirmar el cierre definitivo.
6. **Verificación**: El turno pasa a estado **"Cerrado"**. Se bloquea cualquier nuevo cobro con este turno.

---

## Escenario 5: Generación y Consulta de Ticket de Liquidación (80mm)
1. En la pestaña **"Historial de Turnos"**, seleccionar el turno `TRN-20261027-01`.
2. Pulsar **"Ver Comprobante de Liquidación"**.
3. **Verificación**:
   - Se visualiza el desglose formateado listo para impresión térmica:
     - Fondo inicial: `$20.000`
     - Cobros en efectivo: `$8.500`
     - Retiros: `-$15.000`
     - Efectivo esperado: `$13.500`
     - Efectivo contado: `$13.200`
     - Faltante: `-$300`
     - Débito: `$6.000`
     - Total recaudado: `$14.500`

