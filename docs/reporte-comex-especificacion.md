# Especificación Reporte COMEX - Ventas Detalladas

## Descripción General

Reporte de ventas artículo por artículo siguiendo el formato COMEX. Cada línea del reporte representa un artículo vendido en una orden, con información detallada de la venta, facturación, artículo, precios, impuestos y cliente.

**Características principales:**
- Procesamiento por lotes de órdenes (batch de 100)
- Exportación a Excel (.xlsx)
- ~8,750 artículos con configuración de unidades de medida
- 6-20 sucursales con configuración COMEX
- Soporte para ventas y devoluciones

---

## Estructura de Datos

### Total de Campos: 35

| # | Campo | Tipo | Obligatorio | Ejemplo | Descripción |
|---|-------|------|-------------|---------|-------------|
| 1 | NUM_CONCESIONARIO | string | ✅ | "91234" | Número de concesionario según catálogo COMEX |
| 2 | NUM_CUENTA | string | ✅ | "41111" | Número de cuenta |
| 3 | NUM_SUCURSAL | string | ✅ | "531234" | Número de sucursal según catálogo COMEX |
| 4 | NOMBRE_SUCURSAL | string | ❌ | "Sucursal QA - 6" | Nombre de la sucursal |
| 5 | FECHA_FACTURA | string | ✅ | "02/01/2019" | Fecha de factura en formato dd/mm/yyyy. Si no hay factura = FECHA_PEDIDO |
| 6 | NUMERO_FACTURA | string | ✅ | "801020002" | Número de factura. Si no hay factura = "0" |
| 7 | FECHA_PEDIDO | string | ✅ | "02/01/2019" | Fecha del ticket/pedido en formato dd/mm/yyyy |
| 8 | NUMERO_PEDIDO | string | ✅ | "53093601001750002" | Número del ticket/pedido |
| 9 | NUMERO_CLIENTE | string | ❌ | "1203" | Identificador del cliente en BD local |
| 10 | LINEA | number | ✅ | 1 | Número de línea de partida en el ticket (1, 2, 3...) |
| 11 | SKU | string | ✅ | "2067301" | SKU/código del artículo |
| 12 | DESCRIPCION_SKU | string | ❌ | "20 Thinner Standar" | Descripción/nombre del artículo |
| 13 | CANTIDAD_PIEZAS | number | ✅ | 1 | Cantidad de piezas vendidas. Si es granel = 1. Redondear a 4 decimales |
| 14 | CANTIDAD_LITROS | number | ✅ | 20 | Cantidad en litros según unidad de medida. Ver cálculo especial ⬇️ |
| 15 | PRECIO_UNITARIO_NETO | number | ✅ | 618.00 | Precio unitario sin IVA (con descuento aplicado) |
| 16 | IMPORTE_NETO | number | ✅ | 618.00 | CANTIDAD_PIEZAS × PRECIO_UNITARIO_NETO |
| 17 | FACTOR_IVA | number | ✅ | 16 | Porcentaje de IVA aplicado |
| 18 | COSTO_UNITARIO_NETO | number | ✅ | 491.58 | Costo unitario del artículo al momento de la venta |
| 19 | IMPORTE_NETO_TOTAL | number | ✅ | 2582.00 | Importe neto total del ticket SIN IVA (mismo para todas las líneas) |
| 20 | TIPO_MOVIMIENTO | number | ✅ | 1 | 1 = Venta, 2 = Devolución |
| 21 | NUMERO_CLIENTE_LEALTAD | string | ❌ | "" | Número de cliente del programa de lealtad |
| 22 | RFC_VENTA | string | ❌ | "GARC830624AAA" | RFC del cliente al que se realiza la venta |
| 23 | RAZON_SOCIAL_VENTA | string | ❌ | "Claudia García Romero" | Razón social del cliente de la venta |
| 24 | RFC_FACTURA | string | ❌ | "RUJR631503BBB" | RFC del cliente al que se emite la factura |
| 25 | RAZON_SOCIAL_FACTURA | string | ❌ | "Rosalba Ruiz Jiménez" | Razón social del cliente de la factura |
| 26 | NUMERO_EMPLEADO | string | ❌ | "XS000385" | Identificador del empleado que realiza la venta |
| 27 | NOMBRE_EMPLEADO | string | ❌ | "JUAN MARTINEZ" | Nombre del empleado que realiza la venta |
| 28 | ECOMMERCE | string | ❌ | "NO" | "SI" si es venta por eCommerce, "NO" en otro caso |
| 29 | SEGMENTO | string | ❌ | "Pintor" | Segmento del cliente: Arquitecto, Pintor, Contratista, etc. |
| 30 | GENERO | string | ❌ | "Hombre" | "Hombre" o "Mujer" |
| 31 | EDAD | string | ❌ | "30 a 37 años" | Rango de edad del cliente |
| 32 | FECHA_PEDIDO_ORIGINAL | string | ⚠️ | "02/01/2019" | **Solo para devoluciones**: Fecha del pedido original |
| 33 | NUMERO_PEDIDO_ORIGINAL | string | ⚠️ | "53093601001750001" | **Solo para devoluciones**: Número del pedido original |
| 34 | LINEA_ORIGINAL | number | ⚠️ | 1 | **Solo para devoluciones**: Línea del item en pedido original |


## Mapeo de Datos del Sistema

### Campos Implementables (directo desde BD)

| Campo COMEX | Fuente en Sistema | Modelo | Notas |
|-------------|-------------------|--------|-------|
| NUM_SUCURSAL | `store.comex_num_sucursal` o `store.code` o `store.id` | Store | Nuevo campo `comex_num_sucursal` |
| NOMBRE_SUCURSAL | `store.comex_nombre_oficial` o `store.name` | Store | Nuevo campo `comex_nombre_oficial` |
| FECHA_FACTURA | `order.created` (formato dd/mm/yyyy) | Order | Si hay factura SAT, usar esa fecha |
| NUMERO_FACTURA | `order.sat_folio` o `"0"` | Order | Campo existente SAT |
| FECHA_PEDIDO | `order.created` (formato dd/mm/yyyy) | Order | |
| NUMERO_PEDIDO | `order.id.toString()` | Order | |
| NUMERO_CLIENTE | `order.client_user_id.toString()` | Order | |
| LINEA | índice del item (1, 2, 3...) | - | Calcular en loop |
| SKU | `item.code` o `item.id` | Item | |
| DESCRIPCION_SKU | `item.name` | Item | |
| CANTIDAD_PIEZAS | `order_item.qty` | Order_Item | Redondear a 4 decimales |
| CANTIDAD_LITROS | **Calcular** según `item.unit_type` y `item.unit_capacity` | Item | Ver sección cálculo |
| PRECIO_UNITARIO_NETO | `order_item.unitary_price` | Order_Item | Ya incluye descuento |
| IMPORTE_NETO | `order_item.subtotal` | Order_Item | |
| FACTOR_IVA | `order.tax_percent` o `item.tax_percent` | Order/Item | Default 16 |
| COSTO_UNITARIO_NETO | `item.reference_price` | Item | Costo del artículo |
| IMPORTE_NETO_TOTAL | `order.subtotal` | Order | Mismo para todas las líneas |
| TIPO_MOVIMIENTO | 1 si venta, 2 si devolución | Order | Detectar por `order.is_return` |
| RFC_VENTA | `client.sat_receptor_rfc` | User (cliente) | Campo SAT existente |
| RAZON_SOCIAL_VENTA | `client.sat_razon_social` | User (cliente) | Campo SAT existente |
| RFC_FACTURA | `order.sat_receptor_rfc` | Order | Campo SAT existente |
| RAZON_SOCIAL_FACTURA | `order.sat_razon_social` | Order | Campo SAT existente |
| NUMERO_EMPLEADO | `cashier.id` o `order.cashier_user_id` | User (cajero) | |
| NOMBRE_EMPLEADO | `cashier.name` | User (cajero) | |
| ECOMMERCE | Según `order.service_type` | Order | SI si no es QUICK_SALE |

### Campos NO Implementados (Ponerlos vacios)

| Campo COMEX | Estado | Solución Propuesta |
|-------------|--------|-------------------|
| NUM_CONCESIONARIO | ❌ TODO | Agregar campo `comex_num_concesionario` en Store |
| NUM_CUENTA | ❌ TODO | Agregar campo `comex_num_cuenta` en Store |
| NUMERO_CLIENTE_LEALTAD | ❌ TODO | Sistema de lealtad (Fase 2) |
| SEGMENTO | ❌ TODO | Agregar campo `segmento` en User (Fase 2) |
| GENERO | ❌ TODO | Agregar campo `genero` en User (Fase 2) |
| EDAD | ❌ TODO | Agregar campo `fecha_nacimiento` y calcular rango (Fase 2) |
| FECHA_PEDIDO_ORIGINAL | ❌ TODO | Agregar `original_order_id` en Order |
| NUMERO_PEDIDO_ORIGINAL | ❌ TODO | Agregar `original_order_id` en Order |
| LINEA_ORIGINAL | ❌ TODO | Agregar `original_order_item_id` en Order_Item |


```
NUM_CONCESIONARIO: 91234
NUM_CUENTA: 41111
NUM_SUCURSAL: 531234
NOMBRE_SUCURSAL: Sucursal QA - 6
FECHA_FACTURA: 02/01/2019
NUMERO_FACTURA: 801020002
FECHA_PEDIDO: 02/01/2019
NUMERO_PEDIDO: 53093601001750002
NUMERO_CLIENTE: 1203
LINEA: 1
SKU: 2067301
DESCRIPCION_SKU: 20 Thinner Standar
CANTIDAD_PIEZAS: 1
CANTIDAD_LITROS: 20.0000
PRECIO_UNITARIO_NETO: 618.00
IMPORTE_NETO: 618.00
FACTOR_IVA: 16
COSTO_UNITARIO_NETO: 491.58
IMPORTE_NETO_TOTAL: 2582.00
TIPO_MOVIMIENTO: 1
...
```

Esta orden generaría **3 filas** en el reporte (una por cada item).

---

## Flujo de Procesamiento

```
1. Usuario selecciona filtros:
   - Rango de fechas
   - Sucursale(singular no soportar multiples sucursales)
   - Incluir devoluciones (SI/NO)

2. Sistema cuenta total de órdenes → N órdenes

3. Procesamiento por lotes:
   FOR offset = 0 TO N STEP 100:
	 a. Obtener lote de 100 órdenes con order_info completo
	 b. Para cada orden:
		- Para cada item en la orden:
		  → Generar fila ComexReportRow
		  → Calcular CANTIDAD_LITROS
		  → Formatear fechas dd/mm/yyyy
		  → Redondear números
	 c. Acumular filas
	 d. Reportar progreso: "Procesando 100 de N..."

4. Exportar a Excel:
   - 35 columnas
   - Formato números: 2 decimales para montos, 4 para cantidades
   - Formato fechas: dd/mm/yyyy

5. Descargar archivo: reporte_comex_YYYY-MM-DD.xlsx
```

---

## Validaciones de Calidad

Antes de generar el reporte, validar:

1. ✅ **Órdenes sin cliente**
   - Contar órdenes con `client_user_id IS NULL`
   - Advertir si es significativo

2. ✅ **Artículos sin SKU**
   - Items con `code IS NULL`
   - Usar `item.id` como fallback

---

### Utilidades:
- `/src/app/modules/shared/Finger/ExcelUtils.ts` - Exportación a Excel

---

## Notas de Implementación

1. **Campos opcionales vacíos**: Exportar como `""` (string vacío), no `null`

2. **Devoluciones**: Si `TIPO_MOVIMIENTO = 2`, los montos pueden ser negativos

3. **Facturas pendientes**: Si orden no tiene factura SAT:
   - `FECHA_FACTURA` = `FECHA_PEDIDO`
   - `NUMERO_FACTURA` = `"0"`

4. **Compatibility Excel**: Usar formato de fecha de texto "dd/mm/yyyy" para evitar conversiones automáticas

---
