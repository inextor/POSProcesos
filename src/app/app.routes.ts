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
import { CloseShiftComponent } from './pages/close-shift/close-shift.component';

export const routes: Routes = [
	{path: '', component: LoginComponent},
	{path: '', component: ListProductionAreaComponent},
	{path: 'add-production-area', component: SaveProductionAreaComponent},
	{path: 'edit-production-area/:id', component: SaveProductionAreaComponent},
	{path: 'list-production-area', component: ListProductionAreaComponent},
	{path: 'view-production-area/:id', component: ViewProductionAreaComponent},
	{path: 'add-process/:production_area_id', component: SaveProcessComponent},
	{path: 'edit-process/:id', component: SaveProcessComponent },
//	{path: 'list-process', component: ListProcessComponent},
	{path: 'list-requisition', component: ListRequisitionComponent},
	{path: 'users-checking-clock', component: UsersCheckingClockComponent },
	{path: 'users-attendance', component: ListUserAttendanceComponent},
	{path: 'validate-production', component: ValidateProductionComponent},
	{path: 'list-task', component: ListTaskComponent},
	{path: 'list-shipping', component: ListShippingComponent},
	{path: 'add-shipping/:store_id/:shipping_id', component: SaveShippingComponent},
	{path: 'login', component: LoginComponent},
	{path: 'close-shift', component: CloseShiftComponent},
];


@NgModule({
	imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules, useHash:true})],
	exports: [RouterModule]
})
export class AppRoutingModule { }

