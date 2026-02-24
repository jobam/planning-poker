import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'game/:id',
    loadComponent: () => import('./pages/game/game.component').then((m) => m.GameComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
