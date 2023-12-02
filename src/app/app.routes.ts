import { Routes } from '@angular/router';
import { SaveProductionAreaComponent } from './pages/save-production-area/save-production-area.component';
import { ListProductionAreaComponent } from './pages/list-production-area/list-production-area.component';
import { ViewProductionAreaComponent } from './pages/view-production-area/view-production-area.component';
import { SaveProcessComponent } from './pages/save-process/save-process.component';
import { ListRequisitionComponent } from './pages/list-requisition/list-requisition.component';

export const routes: Routes = [
  {path: '', component: ListProductionAreaComponent},
  {path: 'add-production-area', component: SaveProductionAreaComponent},
  {path: 'edit-production-area/:id', component: SaveProductionAreaComponent},
  {path: 'list-production-area', component: ListProductionAreaComponent},
  {path: 'view-production-area/:id', component: ViewProductionAreaComponent},
  {path: 'add-process/:production_area_id', component: SaveProcessComponent},
  {path: 'edit-process/:id', component: SaveProcessComponent },
  {path: 'list-requisition', component: ListRequisitionComponent},
];
