
import { Component, inject, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import {
  Accesibilidad,
  Tema
} from '../../core/services/accesibilidad';

import {
  AuthService,
  RolUsuario
} from '../../core/services/auth';

import { DescripcionVoz } from '../../shared/directives/descripcion-voz';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
    DescripcionVoz
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {

  accesibilidad = inject(Accesibilidad);
  auth = inject(AuthService);

  private router = inject(Router);

  configuracionAbierta = signal(false);
  menuAbierto = signal(false);

  usuario = this.auth.usuario;

  seleccionarTema(tema: Tema): void {
    this.accesibilidad.cambiarTema(tema);
  }

  rutaPanel(): string {

    const rol: RolUsuario | null = this.auth.obtenerRol();

    switch (rol) {
      case 'CLIENTE':
        return '/cliente';

      case 'ORGANIZADOR':
        return '/organizador';

      case 'ADMIN':
        return '/admin';

      case 'CONTROL_ACCESO':
        return '/control-acceso';

      default:
        return '/login';
    }
  }

  irPanel(): void {
    this.cerrarMenus();
    this.router.navigateByUrl(this.rutaPanel());
  }

  volver(): void {
    this.cerrarMenus();

    // Navegación segura dentro de Eventix.
    this.router.navigateByUrl(
      this.auth.estaAutenticado()
        ? this.rutaPanel()
        : '/'
    );
  }

  cerrarSesion(): void {
    this.cerrarMenus();
    this.accesibilidad.detener();
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }

  cerrarMenus(): void {
    this.configuracionAbierta.set(false);
    this.menuAbierto.set(false);
  }
}
