import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { SaveProductionAreaComponent } from './pages/save-production-area/save-production-area.component';
import { ListProductionAreaComponent } from './pages/list-production-area/list-production-area.component';
import { ViewProductionAreaComponent } from './pages/view-production-area/view-production-area.component';
import { SaveProcessComponent } from './pages/save-process/save-process.component';
import { ListRequisitionComponent } from './pages/list-requisition/list-requisition.component';
import { UsersCheckingClockComponent } from './pages/users-checking-clock/users-checking-clock.component';
import { ListUserAttendanceComponent } from './pages/list-user-attendance/list-user-attendance.component';
import { ValidateProductionComponent } from './pages/validate-production/validate-production.component';
import { ListTaskComponent } from './pages/list-task/list-task.component';
import { LoginComponent } from './pages/login/login.component';
import { SaveShippingComponent } from './pages/save-shipping/save-shipping.component';
import { ListShippingComponent } from './pages/list-shipping/list-shipping.component';
import { NgModule } from '@angular/core';
import { authGuard } from './modules/shared/finger/auth.guard';
import { CloseShiftComponent } from './pages/close-shift/close-shift.component';
/*import { ListPayrollComponent } from './pages/list-payroll/list-payroll.component';
import { SavePayrollConceptComponent } from './pages/save-payroll-concept/save-payroll-concept.component';
import { SavePayrollComponent } from './pages/save-payroll/save-payroll.component';
*/
import { SaveProductionPaymentComponent } from './pages/save-production-payment/save-production-payment.component';
import { SaveWorklogRulesComponent } from './pages/save-worklog-rules/save-worklog-rules.component';
import { SaveUserExtraFieldsComponent } from './pages/save-user-extra-fields/save-user-extra-fields.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { SearchSerialComponent } from './pages/search-serial/search-serial.component';
import { HomeComponent } from './pages/home/home.component';
import { ListRoleComponent } from './pages/list-role/list-role.component';
import { SaveRoleComponent } from './pages/save-role/save-role.component';
import { ListRoleItemPriceComponent } from './pages/list-role-item-price/list-role-item-price.component';
import { ListItemProductionComponent } from './pages/list-item-production/list-item-production.component';
import { ListProductionComponent } from './pages/list-production/list-production.component';
import { ResumeProductionComponent } from './pages/resume-production/resume-production.component';
import { ResumeProductionDayComponent } from './pages/resume-production-day/resume-production-day.component';
import { ListEcommerceOrderComponent } from './pages/list-ecommerce-order/list-ecommerce-order.component';

import { ViewAccountComponent } from './pages/view-account/view-account.component';
import { ViewLedgerComponent } from './pages/view-ledger/view-ledger.component';
import { ListConsumptionComponent } from './pages/list-consumption/list-consumption.component';

import { ReportCashCountTotalsComponent } from './pages/report-cash-count-totals/report-cash-count-totals.component';
import { ReporteEstadoCuentaClienteComponent } from './pages/reporte-estado-cuenta-cliente/reporte-estado-cuenta-cliente.component';
import { TestComponent } from './pages/test/test.component';
import { ListSatFacturaComponent } from './pages/list-sat-factura/list-sat-factura.component';
import { ListObjectSatFacturaComponent } from './pages/list-object-sat-factura/list-object-sat-factura.component';
import { ListMermaTotalsComponent } from './pages/list-merma-totals/list-merma-totals.component';
import { WeirdComponent } from './pages/weird/weird.component';
import { ListItemOnlineComponent } from './pages/list-item-online/list-item-online.component';
import { SaveItemOnlineComponent } from './pages/save-item-online/save-item-online.component';
import { ListProductionAreaItemComponent } from './pages/list-production-area-item/list-production-area-item.component';
import { SaveProductionAreaItemComponent } from './pages/save-production-area-item/save-production-area-item.component';
import { AssignSatFacturaComponent } from './pages/assign-sat-factura/assign-sat-factura.component';


export const routes: Routes = [
	{path: 'login', component: LoginComponent},
	{
		path: '', component: HomeComponent,
		children:
		[
			{path:'', component: DashboardComponent},

			{path: 'view-account', component: ViewAccountComponent, canActivate: [authGuard]},
			{path: 'view-ledger', component: ViewLedgerComponent, canActivate: [authGuard]},
			{path: 'dashboard', component: DashboardComponent, canActivate: [authGuard]},
			{path: 'add-production-area', component: SaveProductionAreaComponent, canActivate: [authGuard]},
			{path: 'edit-production-area/:id', component: SaveProductionAreaComponent, canActivate: [authGuard]},
			{path: 'list-production-area', component: ListProductionAreaComponent, canActivate: [authGuard]},
			{path: 'view-production-area/:id', component: ViewProductionAreaComponent, canActivate: [authGuard]},
			{path: 'list-production-area-item', component: ListProductionAreaItemComponent, canActivate: [authGuard]},
			{path: 'add-production-area-item', component: SaveProductionAreaItemComponent, canActivate: [authGuard]},
			{path: 'edit-production-area-item/:id', component: SaveProductionAreaItemComponent, canActivate: [authGuard]},
			{path: 'add-process/:production_area_id', component: SaveProcessComponent, canActivate: [authGuard]},
			{path: 'edit-process/:id', component: SaveProcessComponent, canActivate: [authGuard]},
			{path: 'list-requisition', component: ListRequisitionComponent, canActivate: [authGuard]},
			{path: 'users-checking-clock', component: UsersCheckingClockComponent, canActivate: [authGuard]},
			{path: 'save-user-extra-fields/:user_id', component: SaveUserExtraFieldsComponent, canActivate: [authGuard]},
			{path: 'users-attendance', component: ListUserAttendanceComponent, canActivate: [authGuard]},
			{path: 'validate-production', component: ValidateProductionComponent, canActivate: [authGuard]},
			{path: 'list-task', component: ListTaskComponent, canActivate: [authGuard]},
			{path: 'list-shipping', component: ListShippingComponent, canActivate: [authGuard]},
			{path: 'add-shipping', component: SaveShippingComponent, canActivate: [authGuard]},
			{path: 'add-shipping/:store_id', component: SaveShippingComponent, canActivate: [authGuard]},
			{path: 'edit-shipping/:id', component: SaveShippingComponent, canActivate: [authGuard]},
			{path: 'close-shift', component: CloseShiftComponent},
			{path: 'save-production-payment', component: SaveProductionPaymentComponent, canActivate: [authGuard]},
			/*
			{path: 'save-payroll-concept', component: SavePayrollConceptComponent, canActivate: [authGuard]},
			{path: 'create-payroll', component: SavePayrollComponent, canActivate: [authGuard]},
			{path: 'edit-payroll/:id', component: SavePayrollComponent, canActivate: [authGuard]},
			{path: 'list-payroll', component: ListPayrollComponent, canActivate: [authGuard]},
			*/
			{path: 'save-worklog-rules', component: SaveWorklogRulesComponent, canActivate: [authGuard]},
			{path: 'search-serial', component: SearchSerialComponent, canActivate: [authGuard]},
			{path: 'rentals', loadChildren: () => import('./modules/rentals/rentals.module').then(m => m.RentalsModule)},
			{path: 'list-role', component: ListRoleComponent, canActivate: [authGuard]},
			{path: 'add-role', component: SaveRoleComponent, canActivate: [authGuard]},
			{path: 'edit-role/:id', component: SaveRoleComponent, canActivate: [authGuard]},
			{path: 'list-role-item-price', component: ListRoleItemPriceComponent, canActivate: [authGuard]},
			{path: 'list-production', component: ListProductionComponent, canActivate: [authGuard]},
			{
						path: 'list-item-online', component: ListItemOnlineComponent, canActivate: [authGuard]
					},
					{path: 'add-item-online', component: SaveItemOnlineComponent, canActivate: [authGuard]},
					{path: 'edit-item-online/:id', component: SaveItemOnlineComponent, canActivate: [authGuard]},
			
			{path: 'resume-production', component: ResumeProductionComponent, canActivate: [authGuard]},
			{path: 'resume-production-day', component: ResumeProductionDayComponent, canActivate: [authGuard]},
			{path: 'list-ecommerce-order', component: ListEcommerceOrderComponent, canActivate: [authGuard]},
			{path: 'list-consumption', component: ListConsumptionComponent, canActivate: [authGuard]},
			{path: 'report-cash-count-totals', component: ReportCashCountTotalsComponent, canActivate: [authGuard]},
			{path: 'reporte-estado-cuenta-cliente', component: ReporteEstadoCuentaClienteComponent, canActivate: [authGuard]},
			{path: 'test', component: TestComponent, canActivate: [authGuard]},
			{path: 'list-sat-factura', component: ListSatFacturaComponent, canActivate: [authGuard]},
			{path: 'assign-sat-factura', component: AssignSatFacturaComponent, canActivate: [authGuard]},
			{path: 'list-order-sat-factura/:order_id', component: ListObjectSatFacturaComponent},
			{path: 'list-payment-sat-factura/:payment_id', component: ListObjectSatFacturaComponent},
			{path: 'list-merma-totals', component: ListMermaTotalsComponent, canActivate: [authGuard]},
			{path: 'list-item-online', component: ListItemOnlineComponent, canActivate: [authGuard]},
			{path: 'weird', component: WeirdComponent, canActivate: [authGuard]},
		]
	},
];


