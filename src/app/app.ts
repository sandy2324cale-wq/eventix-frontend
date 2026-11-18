
import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

import { Navbar } from './layout/navbar/navbar';
import { Footer } from './layout/footer/footer';
import { Accesibilidad as AccesibilidadComponente } from './shared/accesibilidad/accesibilidad';
import { Accesibilidad } from './core/services/accesibilidad';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    Navbar,
    Footer,
    AccesibilidadComponente
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

  accesibilidad = inject(Accesibilidad);

  private router = inject(Router);

  private rutaActual = toSignal(
    this.router.events.pipe(
      filter((evento): evento is NavigationEnd =>
        evento instanceof NavigationEnd
      ),
      map(evento => evento.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  esDashboard = computed(() => {
    const ruta = this.rutaActual().split('?')[0];

    return [
      '/cliente',
      '/organizador',
      '/admin',
      '/control-acceso'
    ].some(
      dashboard =>
        ruta === dashboard ||
        ruta.startsWith(dashboard + '/')
    );
  });
}
