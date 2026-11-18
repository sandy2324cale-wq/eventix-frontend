
import { Component, inject, signal } from '@angular/core';
import { TemaService } from '../../core/services/tema';

@Component({
  selector: 'app-accesibilidad',
  standalone: true,
  templateUrl: './accesibilidad.html',
  styleUrl: './accesibilidad.scss'
})
export class Accesibilidad {

  temaService = inject(TemaService);

  abierto = signal(false);

  alternarPanel(): void {
    this.abierto.update(valor => !valor);
  }
}
