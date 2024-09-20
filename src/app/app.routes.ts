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
import { ListPayrollComponent } from './pages/list-payroll/list-payroll.component';
import { SavePayrollConceptComponent } from './pages/save-payroll-concept/save-payroll-concept.component';
import { SavePayrollComponent } from './pages/save-payroll/save-payroll.component';
import { SaveProductionPaymentComponent } from './pages/save-production-payment/save-production-payment.component';
import { SaveWorklogRulesComponent } from './pages/save-worklog-rules/save-worklog-rules.component';
import { SaveUserExtraFieldsComponent } from './pages/save-user-extra-fields/save-user-extra-fields.component';
import { ListProductionAreaItemComponent } from './pages/list-production-area-item/list-production-area-item.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const routes: Routes = [
	{path: '', component: LoginComponent, canActivate: [authGuard]},
	{path: 'dashboard', component: DashboardComponent, canActivate: [authGuard]},
	{path: 'add-production-area', component: SaveProductionAreaComponent, canActivate: [authGuard]},
	{path: 'edit-production-area/:id', component: SaveProductionAreaComponent, canActivate: [authGuard]},
	{path: 'list-production-area', component: ListProductionAreaComponent, canActivate: [authGuard]},
	{path: 'view-production-area/:id', component: ViewProductionAreaComponent, canActivate: [authGuard]},
	{path: 'add-process/:production_area_id', component: SaveProcessComponent, canActivate: [authGuard]},
	{path: 'edit-process/:id', component: SaveProcessComponent, canActivate: [authGuard]},
//	{path: 'list-process', component: ListProcessComponent},
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
	{path: 'login', component: LoginComponent},
	{path: 'close-shift', component: CloseShiftComponent},
	{path: 'save-production-payment', component: SaveProductionPaymentComponent, canActivate: [authGuard]},
	{path: 'save-payroll-concept', component: SavePayrollConceptComponent, canActivate: [authGuard]},
	{path: 'create-payroll', component: SavePayrollComponent, canActivate: [authGuard]},
	{path: 'edit-payroll/:id', component: SavePayrollComponent, canActivate: [authGuard]},
	{path: 'list-payroll', component: ListPayrollComponent, canActivate: [authGuard]},
	{path: 'save-worklog-rules', component: SaveWorklogRulesComponent, canActivate: [authGuard]}
];


@NgModule({
	imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules, useHash:true})],
	exports: [RouterModule]
})
export class AppRoutingModule { }

