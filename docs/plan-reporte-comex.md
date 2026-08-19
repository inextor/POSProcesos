# Plan de Implementación: Reporte COMEX de Ventas

## Resumen Ejecutivo

Implementar un sistema completo de reporte de ventas artículo por artículo siguiendo el formato COMEX, incluyendo:
- Configuración de datos COMEX para 6-20 sucursales
- Procesamiento por lotes de órdenes
- Exportación a Excel con 30+ campos

**Tiempo total estimado**: 65-75 horas de desarrollo + 20-25 horas de configuración de datos

**Archivo**: `src/app/modules/shared/Models.ts`

```typescript
export interface ComexReportRow {
  NUM_CONCESIONARIO: string;
  NUM_CUENTA: string;
  NUM_SUCURSAL: string;
  NOMBRE_SUCURSAL: string;
  FECHA_FACTURA: string;
  NUMERO_FACTURA: string;
  FECHA_PEDIDO: string;
  NUMERO_PEDIDO: string;
  NUMERO_CLIENTE: string;
  LINEA: number;
  SKU: string;
  DESCRIPCION_SKU: string;
  CANTIDAD_PIEZAS: number;
  CANTIDAD_LITROS: number;
  PRECIO_UNITARIO_NETO: number;
  IMPORTE_NETO: number;
  FACTOR_IVA: number;
  COSTO_UNITARIO_NETO: number;
  IMPORTE_NETO_TOTAL: number;
  TIPO_MOVIMIENTO: 1 | 2;
  NUMERO_CLIENTE_LEALTAD: string;
  RFC_VENTA: string;
  RAZON_SOCIAL_VENTA: string;
  RFC_FACTURA: string;
  RAZON_SOCIAL_FACTURA: string;
  NUMERO_EMPLEADO: string;
  NOMBRE_EMPLEADO: string;
  ECOMMERCE: 'SI' | 'NO';
  SEGMENTO: string;
  GENERO: string;
  EDAD: string;
  FECHA_PEDIDO_ORIGINAL: string;
  NUMERO_PEDIDO_ORIGINAL: string;
  LINEA_ORIGINAL: number | string;
}

export interface ComexReportFilters {
  date_start: Date;
  date_end: Date;
  store_ids?: number[];
  client_user_id?: number;
  include_returns?: boolean;
}

export interface ComexReportProgress {
  current: number;
  total: number;
  message: string;
  percentage: number;
}
```

#### 2.4 Componente UI (3-4 horas)

**Archivo**: `src/app/pages/report-comex-sales/`

**Features**:
- **Filtros**:
  - Rango de fechas (date picker)
  - Selección múltiple de sucursales

- **Generación**:
  - Botón "Generar Reporte"
  - Barra de progreso con mensaje
  - Preview de primeras 100 filas
  - Estadísticas: total órdenes, total items, rango fechas

- **Descarga**:
  - Botón "Descargar Excel"
  - Nombre: `reporte_comex_YYYY-MM-DD.xlsx`

#### 2.5 Routing y Menú (30 min)
- Agregar ruta en `app.routes.ts`
- Agregar opción en menú de reportes

