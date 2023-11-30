import { Routes } from '@angular/router';
import { SaveProductionAreaComponent } from './pages/save-production-area/save-production-area.component';
import { ListProductionAreaComponent } from './pages/list-production-area/list-production-area.component';

export const routes: Routes = [
  {path: '', component: ListProductionAreaComponent},
  {path: 'add-production-area', component: SaveProductionAreaComponent},
  {path: 'edit-production-area', component: SaveProductionAreaComponent},
  {path: 'list-production-area', component: ListProductionAreaComponent},
];
