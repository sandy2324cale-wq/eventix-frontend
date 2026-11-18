
import {
  Component,
  computed,
  inject,
  signal
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { DescripcionVoz } from '../../shared/directives/descripcion-voz';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    DescripcionVoz
  ],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class Inicio {

  private router = inject(Router);

  busqueda = signal('');
  ciudad = signal('');
  categoria = signal('');

  filtrosActivos = computed(() =>
    Boolean(
      this.busqueda().trim() ||
      this.ciudad() ||
      this.categoria()
    )
  );

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.ciudad.set('');
    this.categoria.set('');
  }

  buscarEventos(): void {

    const parametros: Record<string, string> = {};

    if (this.busqueda().trim()) {
      parametros['buscar'] = this.busqueda().trim();
    }

    if (this.ciudad()) {
      parametros['ciudad'] = this.ciudad();
    }

    if (this.categoria()) {
      parametros['categoria'] = this.categoria();
    }

    this.router.navigate(['/eventos'], {
      queryParams: parametros
    });
  }
}
