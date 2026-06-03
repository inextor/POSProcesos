# Admin Pages

Admin-related pages in the application manage system configuration, production, inventory, and business operations.

## Production Management

| Route | Component | Description |
|-------|-----------|-------------|
| `/list-production-area` | ListProductionAreaComponent | List production areas |
| `/add-production-area` | SaveProductionAreaComponent | Create production area |
| `/edit-production-area/:id` | SaveProductionAreaComponent | Edit production area |
| `/view-production-area/:id` | ViewProductionAreaComponent | View area details |
| `/list-production-area-item` | ListProductionAreaItemComponent | List area items |
| `/add-production-area-item` | SaveProductionAreaItemComponent | Create area item |
| `/edit-production-area-item/:id` | SaveProductionAreaItemComponent | Edit area item |
| `/add-process/:production_area_id` | SaveProcessComponent | Create process |
| `/edit-process/:id` | SaveProcessComponent | Edit process |
| `/list-production` | ListProductionComponent | List productions |
| `/validate-production` | ValidateProductionComponent | Validate production |
| `/resume-production` | ResumeProductionComponent | Production summary |
| `/resume-production-day` | ResumeProductionDayComponent | Daily production summary |
| `/save-production-payment` | SaveProductionPaymentComponent | Production payment |
| `/production-report` | ProductionReportComponent | Production reports |

## Inventory & Items

| Route | Component | Description |
|-------|-----------|-------------|
| `/list-item-online` | ListItemOnlineComponent | Online items |
| `/add-item-online` | SaveItemOnlineComponent | Create online item |
| `/edit-item-online/:id` | SaveItemOnlineComponent | Edit online item |
| `/list-item-store` | ListItemStoreComponent | Store items |
| `/list-item-provider` | ListItemProviderComponent | Provider items |
| `/add-item-provider` | SaveItemProviderComponent | Create provider item |
| `/edit-item-provider/:id` | SaveItemProviderComponent | Edit provider item |
| `/view-item-provider/:id` | ViewItemProviderComponent | View provider item |
| `/list-item-transform` | ListItemTransformComponent | Transform items |
| `/add-item-transform` | SaveItemTransformComponent | Create transform item |
| `/edit-item-transform/:id` | SaveItemTransformComponent | Edit transform item |
| `/view-item-transform/:id` | ViewItemTransformComponent | View transform item |
| `/list-category-store` | ListCategoryStoreComponent | Store categories |
| `/list-storage-type` | ListStorageTypeComponent | Storage types |
| `/add-storage-type` | SaveStorageTypeComponent | Create storage type |
| `/edit-storage-type/:id` | SaveStorageTypeComponent | Edit storage type |
| `/list-transformation` | ListTransformationComponent | Transformations |
| `/add-transformation` | SaveTransformationComponent | Create transformation |
| `/edit-transformation/:id` | SaveTransformationComponent | Edit transformation |
| `/list-batch-record` | ListBatchRecordComponent | Batch records |
| `/list-storage-record` | ListStorageRecordComponent | Storage records |

## Shipping & Requisitions

| Route | Component | Description |
|-------|-----------|-------------|
| `/list-requisition` | ListRequisitionComponent | List requisitions |
| `/list-shipping` | ListShippingComponent | List shipments |
| `/add-shipping` | SaveShippingComponent | Create shipment |
| `/add-shipping/:store_id` | SaveShippingComponent | Create shipment for store |
| `/edit-shipping/:id` | SaveShippingComponent | Edit shipment |

## Users & Attendance

| Route | Component | Description |
|-------|-----------|-------------|
| `/users-checking-clock` | UsersCheckingClockComponent | Clock in/out tracking |
| `/save-user-extra-fields/:user_id` | SaveUserExtraFieldsComponent | Extra user fields |
| `/users-attendance` | ListUserAttendanceComponent | User attendance |

## E-Commerce

| Route | Component | Description |
|-------|-----------|-------------|
| `/list-ecommerce-order` | ListEcommerceOrderComponent | E-commerce orders |

## Tasks

| Route | Component | Description |
|-------|-----------|-------------|
| `/list-task` | ListTaskComponent | Task list |
| `/list-task-comment` | ListTaskCommentComponent | Task comments |

## Purchasing

| Route | Component | Description |
|-------|-----------|-------------|
| `/list-purchase` | ListPurchaseComponent | Purchase list |
| `/purchase` | SavePurchaseComponent | Create purchase |

## Roles & Permissions

| Route | Component | Description |
|-------|-----------|-------------|
| `/list-role` | ListRoleComponent | Role list |
| `/add-role` | SaveRoleComponent | Create role |
| `/edit-role/:id` | SaveRoleComponent | Edit role |
| `/list-role-item-price` | ListRoleItemPriceComponent | Role item prices |

## SAT Invoicing

| Route | Component | Description |
|-------|-----------|-------------|
| `/list-sat-factura` | ListSatFacturaComponent | SAT invoices |
| `/assign-sat-factura` | AssignSatFacturaComponent | Assign invoice |
| `/assign-sat-factura/:order_id` | AssignSatFacturaComponent | Assign by order |
| `/assign-sat-factura-payment` | AssignSatFacturaPaymentComponent | Assign payment invoice |
| `/assign-sat-factura-payment/:payment_id` | AssignSatFacturaPaymentComponent | Assign by payment |
| `/list-order-sat-factura/:order_id` | ListObjectSatFacturaComponent | Order invoices |
| `/list-payment-sat-factura/:payment_id` | ListObjectSatFacturaComponent | Payment invoices |
| `/factura-asis/:order_id` | FacturaAsisComponent | Quick invoice |

## Worklog & Configuration

| Route | Component | Description |
|-------|-----------|-------------|
| `/save-worklog-rules` | SaveWorklogRulesComponent | Work log rules |
| `/list-printer` | ListPrinterComponent | Printer list |
| `/add-printer` | SavePrinterComponent | Create printer |
| `/edit-printer/:id` | SavePrinterComponent | Edit printer |
| `/search-serial` | SearchSerialComponent | Serial search |
| `/consumption` | ListConsumptionComponent | Consumption list |
| `/close-shift` | CloseShiftComponent | Close cash shift |
| `/list-cash-close-detail/:id` | ListCashCloseDetailComponent | Cash close details |

## Reports

| Route | Component | Description |
|-------|-----------|-------------|
| `/report-cash-count-totals` | ReportCashCountTotalsComponent | Cash count totals |
| `/reporte-estado-cuenta-cliente` | ReporteEstadoCuentaClienteComponent | Client statement |
| `/reporte-estado-cuenta-proveedor` | ReporteEstadoCuentaProveedorComponent | Provider statement |
| `/report-comex-sales` | ReportComexSalesComponent | Comex sales |
| `/item-sales-by-client-report` | ItemSalesByClientReportComponent | Sales by client |
| `/commission-report` | CommissionReportComponent | Commission report |
| `/payment-commission-report` | PaymentCommissionReportComponent | Payment commissions |
| `/pending-commissions-report` | PendingCommissionsReportComponent | Pending commissions |
| `/paid-commissions-report` | PaidCommissionsReportComponent | Paid commissions |
| `/item-movement-report` | ItemMovementReportComponent | Item movement |
| `/item-movement-all-stores-report` | ItemMovementAllStoresReportComponent | Movement all stores |
| `/report-credit-payments` | ReportCreditPaymentsComponent | Credit payments |
| `/provider-resume` | ProviderResumeComponent | Provider summary |
| `/list-merma-totals` | ListMermaTotalsComponent | Waste totals |
