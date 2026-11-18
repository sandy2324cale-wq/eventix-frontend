import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  // PÁGINAS PÚBLICAS
  {
    path: '',
    loadComponent: () => import('./pages/inicio/inicio').then(m => m.Inicio),
    title: 'Inicio | Eventix'
  },
  {
    path: 'eventos',
    loadComponent: () => import('./pages/eventos/eventos').then(m => m.Eventos),
    title: 'Eventos | Eventix'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
    title: 'Iniciar sesión | Eventix'
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro').then(m => m.Registro),
    title: 'Crear cuenta | Eventix'
  },
  {
    path: 'verificar-correo',
    loadComponent: () => import('./pages/verificar-correo/verificar-correo').then(m => m.VerificarCorreo),
    title: 'Verificar correo | Eventix'
  },
  {
    path: 'apelacion',
    loadComponent: () => import('./pages/apelacion/apelacion').then(m => m.Apelacion),
    title: 'Apelación de cuenta | Eventix'
  },

  { path: 'activar-personal', loadComponent: () => import('./pages/activar-personal/activar-personal').then(m => m.ActivarPersonal), title: 'Activar personal | Eventix' },

  // RUTAS PRIVADAS: una sola ruta por rol
  {
    path: 'cliente',
    loadComponent: () => import('./dashboards/cliente/cliente').then(m => m.Cliente),
    canActivate: [authGuard(['CLIENTE'])],
    title: 'Mi cuenta | Eventix'
  },
  {
    path: 'organizador',
    loadComponent: () => import('./dashboards/organizador/organizador').then(m => m.Organizador),
    canActivate: [authGuard(['ORGANIZADOR'])],
    title: 'Organizador | Eventix'
  },
  {
    path: 'admin',
    loadComponent: () => import('./dashboards/admin/admin').then(m => m.Admin),
    canActivate: [authGuard(['ADMIN'])],
    title: 'Administración | Eventix'
  },
  {
    path: 'control-acceso',
    loadComponent: () => import('./dashboards/control-acceso/control-acceso').then(m => m.ControlAcceso),
    canActivate: [authGuard(['CONTROL_ACCESO'])],
    title: 'Control de acceso | Eventix'
  },
  { path: '**', redirectTo: '' }
];
