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
import { ProductionReportComponent } from './pages/production-report/production-report.component';

export const routes: Routes = [
	{path: '', component: LoginComponent, canActivate: [authGuard]},
	{path: '', component: ListProductionAreaComponent, canActivate: [authGuard]},
	{path: 'add-production-area', component: SaveProductionAreaComponent, canActivate: [authGuard]},
	{path: 'edit-production-area/:id', component: SaveProductionAreaComponent, canActivate: [authGuard]},
	{path: 'list-production-area', component: ListProductionAreaComponent, canActivate: [authGuard]},
	{path: 'view-production-area/:id', component: ViewProductionAreaComponent, canActivate: [authGuard]},
	{path: 'add-process/:production_area_id', component: SaveProcessComponent, canActivate: [authGuard]},
	{path: 'edit-process/:id', component: SaveProcessComponent, canActivate: [authGuard]},
//	{path: 'list-process', component: ListProcessComponent},
	{path: 'list-requisition', component: ListRequisitionComponent, canActivate: [authGuard]},
	{path: 'users-checking-clock', component: UsersCheckingClockComponent, canActivate: [authGuard]},
	{path: 'users-attendance', component: ListUserAttendanceComponent, canActivate: [authGuard]},
	{path: 'validate-production', component: ValidateProductionComponent, canActivate: [authGuard]},
	{path: 'list-task', component: ListTaskComponent, canActivate: [authGuard]},
	{path: 'list-shipping', component: ListShippingComponent, canActivate: [authGuard]},
	{path: 'add-shipping/:store_id/:shipping_id', component: SaveShippingComponent, canActivate: [authGuard]},
	{path: 'login', component: LoginComponent},
	{path: 'close-shift', component: CloseShiftComponent},
	{path: 'production-report', component: ProductionReportComponent, canActivate: [authGuard]}
];


@NgModule({
	imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules, useHash:true})],
	exports: [RouterModule]
})
export class AppRoutingModule { }

