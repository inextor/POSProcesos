import { Routes } from '@angular/router';
import { SaveProductionAreaComponent } from './pages/save-production-area/save-production-area.component';

export const routes: Routes = [
  {path: '', component: SaveProductionAreaComponent},
  {path: 'add-production-area', component: SaveProductionAreaComponent},
  {path: 'edit-production-area', component: SaveProductionAreaComponent},
];
