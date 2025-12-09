import { Routes } from '@angular/router';
import { authGuard } from './modules/shared/finger/auth.guard';


export const routes: Routes = [
	{path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)},
	{
		path: '',
		loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
		children:
		[
			{path:'', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)},

			{path: 'view-account', loadComponent: () => import('./pages/view-account/view-account.component').then(m => m.ViewAccountComponent), canActivate: [authGuard]},
			{path: 'view-ledger', loadComponent: () => import('./pages/view-ledger/view-ledger.component').then(m => m.ViewLedgerComponent), canActivate: [authGuard]},
			{path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard]},
			{path: 'add-production-area', loadComponent: () => import('./pages/save-production-area/save-production-area.component').then(m => m.SaveProductionAreaComponent), canActivate: [authGuard]},
			{path: 'edit-production-area/:id', loadComponent: () => import('./pages/save-production-area/save-production-area.component').then(m => m.SaveProductionAreaComponent), canActivate: [authGuard]},
			{path: 'list-production-area', loadComponent: () => import('./pages/list-production-area/list-production-area.component').then(m => m.ListProductionAreaComponent), canActivate: [authGuard]},
			{path: 'view-production-area/:id', loadComponent: () => import('./pages/view-production-area/view-production-area.component').then(m => m.ViewProductionAreaComponent), canActivate: [authGuard]},
			{path: 'list-production-area-item', loadComponent: () => import('./pages/list-production-area-item/list-production-area-item.component').then(m => m.ListProductionAreaItemComponent), canActivate: [authGuard]},
			{path: 'add-production-area-item', loadComponent: () => import('./pages/save-production-area-item/save-production-area-item.component').then(m => m.SaveProductionAreaItemComponent), canActivate: [authGuard]},
			{path: 'edit-production-area-item/:id', loadComponent: () => import('./pages/save-production-area-item/save-production-area-item.component').then(m => m.SaveProductionAreaItemComponent), canActivate: [authGuard]},
			{path: 'add-process/:production_area_id', loadComponent: () => import('./pages/save-process/save-process.component').then(m => m.SaveProcessComponent), canActivate: [authGuard]},
			{path: 'edit-process/:id', loadComponent: () => import('./pages/save-process/save-process.component').then(m => m.SaveProcessComponent), canActivate: [authGuard]},
			{path: 'list-requisition', loadComponent: () => import('./pages/list-requisition/list-requisition.component').then(m => m.ListRequisitionComponent), canActivate: [authGuard]},
			{path: 'users-checking-clock', loadComponent: () => import('./pages/users-checking-clock/users-checking-clock.component').then(m => m.UsersCheckingClockComponent), canActivate: [authGuard]},
			{path: 'save-user-extra-fields/:user_id', loadComponent: () => import('./pages/save-user-extra-fields/save-user-extra-fields.component').then(m => m.SaveUserExtraFieldsComponent), canActivate: [authGuard]},
			{path: 'users-attendance', loadComponent: () => import('./pages/list-user-attendance/list-user-attendance.component').then(m => m.ListUserAttendanceComponent), canActivate: [authGuard]},
			{path: 'validate-production', loadComponent: () => import('./pages/validate-production/validate-production.component').then(m => m.ValidateProductionComponent), canActivate: [authGuard]},
			{path: 'list-task', loadComponent: () => import('./pages/list-task/list-task.component').then(m => m.ListTaskComponent), canActivate: [authGuard]},
			{path: 'list-shipping', loadComponent: () => import('./pages/list-shipping/list-shipping.component').then(m => m.ListShippingComponent), canActivate: [authGuard]},
			{path: 'add-shipping', loadComponent: () => import('./pages/save-shipping/save-shipping.component').then(m => m.SaveShippingComponent), canActivate: [authGuard]},
			{path: 'add-shipping/:store_id', loadComponent: () => import('./pages/save-shipping/save-shipping.component').then(m => m.SaveShippingComponent), canActivate: [authGuard]},
			{path: 'edit-shipping/:id', loadComponent: () => import('./pages/save-shipping/save-shipping.component').then(m => m.SaveShippingComponent), canActivate: [authGuard]},
			{path: 'close-shift', loadComponent: () => import('./pages/close-shift/close-shift.component').then(m => m.CloseShiftComponent)},
			{path: 'list-cash-close-detail/:id', loadComponent: () => import('./pages/list-cash-close-detail/list-cash-close-detail.component').then(m => m.ListCashCloseDetailComponent), canActivate: [authGuard]},
			{path: 'save-production-payment', loadComponent: () => import('./pages/save-production-payment/save-production-payment.component').then(m => m.SaveProductionPaymentComponent), canActivate: [authGuard]},
			/*
			{path: 'save-payroll-concept', loadComponent: () => import('./pages/save-payroll-concept/save-payroll-concept.component').then(m => m.SavePayrollConceptComponent), canActivate: [authGuard]},
			{path: 'create-payroll', loadComponent: () => import('./pages/save-payroll/save-payroll.component').then(m => m.SavePayrollComponent), canActivate: [authGuard]},
			{path: 'edit-payroll/:id', loadComponent: () => import('./pages/save-payroll/save-payroll.component').then(m => m.SavePayrollComponent), canActivate: [authGuard]},
			{path: 'list-payroll', loadComponent: () => import('./pages/list-payroll/list-payroll.component').then(m => m.ListPayrollComponent), canActivate: [authGuard]},
			*/
			{path: 'save-worklog-rules', loadComponent: () => import('./pages/save-worklog-rules/save-worklog-rules.component').then(m => m.SaveWorklogRulesComponent), canActivate: [authGuard]},
			{path: 'search-serial', loadComponent: () => import('./pages/search-serial/search-serial.component').then(m => m.SearchSerialComponent), canActivate: [authGuard]},
			{path: 'rentals', loadChildren: () => import('./modules/rentals/rentals.module').then(m => m.RentalsModule)},
			{path: 'list-role', loadComponent: () => import('./pages/list-role/list-role.component').then(m => m.ListRoleComponent), canActivate: [authGuard]},
			{path: 'add-role', loadComponent: () => import('./pages/save-role/save-role.component').then(m => m.SaveRoleComponent), canActivate: [authGuard]},
			{path: 'edit-role/:id', loadComponent: () => import('./pages/save-role/save-role.component').then(m => m.SaveRoleComponent), canActivate: [authGuard]},
			{path: 'list-role-item-price', loadComponent: () => import('./pages/list-role-item-price/list-role-item-price.component').then(m => m.ListRoleItemPriceComponent), canActivate: [authGuard]},
			{path: 'list-production', loadComponent: () => import('./pages/list-production/list-production.component').then(m => m.ListProductionComponent), canActivate: [authGuard]},
			{path: 'list-item-online', loadComponent: () => import('./pages/list-item-online/list-item-online.component').then(m => m.ListItemOnlineComponent), canActivate: [authGuard]},
			{path: 'add-item-online', loadComponent: () => import('./pages/save-item-online/save-item-online.component').then(m => m.SaveItemOnlineComponent), canActivate: [authGuard]},
			{path: 'edit-item-online/:id', loadComponent: () => import('./pages/save-item-online/save-item-online.component').then(m => m.SaveItemOnlineComponent), canActivate: [authGuard]},
			{path: 'list-item-store', loadComponent: () => import('./pages/list-item-store/list-item-store.component').then(m => m.ListItemStoreComponent), canActivate: [authGuard]},
			{path: 'list-category-store', loadComponent: () => import('./pages/list-category-store/list-category-store.component').then(m => m.ListCategoryStoreComponent), canActivate: [authGuard]},
			{path: 'resume-production', loadComponent: () => import('./pages/resume-production/resume-production.component').then(m => m.ResumeProductionComponent), canActivate: [authGuard]},
			{path: 'resume-production-day', loadComponent: () => import('./pages/resume-production-day/resume-production-day.component').then(m => m.ResumeProductionDayComponent), canActivate: [authGuard]},
			{path: 'list-ecommerce-order', loadComponent: () => import('./pages/list-ecommerce-order/list-ecommerce-order.component').then(m => m.ListEcommerceOrderComponent), canActivate: [authGuard]},
			{path: 'list-consumption', loadComponent: () => import('./pages/list-consumption/list-consumption.component').then(m => m.ListConsumptionComponent), canActivate: [authGuard]},
			{path: 'report-cash-count-totals', loadComponent: () => import('./pages/report-cash-count-totals/report-cash-count-totals.component').then(m => m.ReportCashCountTotalsComponent), canActivate: [authGuard]},
			{path: 'reporte-estado-cuenta-cliente', loadComponent: () => import('./pages/reporte-estado-cuenta-cliente/reporte-estado-cuenta-cliente.component').then(m => m.ReporteEstadoCuentaClienteComponent), canActivate: [authGuard]},
			{path: 'factura-asis/:order_id', loadComponent: () => import('./pages/factura-asis/factura-asis.component').then(m => m.FacturaAsisComponent), canActivate: [authGuard]},
			{path: 'test', loadComponent: () => import('./pages/test/test.component').then(m => m.TestComponent), canActivate: [authGuard]},
			{path: 'list-sat-factura', loadComponent: () => import('./pages/list-sat-factura/list-sat-factura.component').then(m => m.ListSatFacturaComponent), canActivate: [authGuard]},
			{path: 'assign-sat-factura', loadComponent: () => import('./pages/assign-sat-factura/assign-sat-factura.component').then(m => m.AssignSatFacturaComponent), canActivate: [authGuard]},
			{path: 'assign-sat-factura/:order_id', loadComponent: () => import('./pages/assign-sat-factura/assign-sat-factura.component').then(m => m.AssignSatFacturaComponent), canActivate: [authGuard]},
			{path: 'assign-sat-factura-payment', loadComponent: () => import('./pages/assign-sat-factura-payment/assign-sat-factura-payment.component').then(m => m.AssignSatFacturaPaymentComponent), canActivate: [authGuard]},
			{path: 'assign-sat-factura-payment/:payment_id', loadComponent: () => import('./pages/assign-sat-factura-payment/assign-sat-factura-payment.component').then(m => m.AssignSatFacturaPaymentComponent), canActivate: [authGuard]},
			{path: 'list-order-sat-factura/:order_id', loadComponent: () => import('./pages/list-object-sat-factura/list-object-sat-factura.component').then(m => m.ListObjectSatFacturaComponent)},
			{path: 'list-payment-sat-factura/:payment_id', loadComponent: () => import('./pages/list-object-sat-factura/list-object-sat-factura.component').then(m => m.ListObjectSatFacturaComponent)},
			{path: 'list-merma-totals', loadComponent: () => import('./pages/list-merma-totals/list-merma-totals.component').then(m => m.ListMermaTotalsComponent), canActivate: [authGuard]},
			{path: 'weird', loadComponent: () => import('./pages/weird/weird.component').then(m => m.WeirdComponent), canActivate: [authGuard]},
			{path: 'report-comex-sales', loadComponent: () => import('./pages/report-comex-sales/report-comex-sales.component').then(m => m.ReportComexSalesComponent), canActivate: [authGuard]}
		]
	},
];


