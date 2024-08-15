import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RentalsComponent } from './rentals.component';
import { ListReservationComponent } from './pages/list-reservation/list-reservation.component';
import { SaveReservationComponent } from './pages/save-reservation/save-reservation.component';
import { ViewReservationComponent } from './pages/view-reservation/view-reservation.component';

const routes: Routes =
[
	{path: '', component: RentalsComponent },
	{path: 'list-reservation', component: ListReservationComponent },
	{path: 'add-reservation', component: SaveReservationComponent},
	{path: 'edit-reservation/:id', component: SaveReservationComponent},
	{path: 'view-reservation/:id', component: ViewReservationComponent},
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RentalsRoutingModule { }
