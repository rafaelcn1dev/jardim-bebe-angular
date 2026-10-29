import { Routes } from '@angular/router';
import { JardimComponent } from './jardim.component';
import { BaixarComponent } from './baixar.component';

export const routes: Routes = [
  { path: '', component: JardimComponent },
  { path: 'baixar', component: BaixarComponent },
  { path: '**', redirectTo: '' },
];
