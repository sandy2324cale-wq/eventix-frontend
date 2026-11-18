
import { Injectable, computed, inject } from '@angular/core';
import {
  Accesibilidad,
  Tema as TemaAccesibilidad
} from './accesibilidad';

export type Tema = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class TemaService {

  private readonly accesibilidad = inject(Accesibilidad);

  tema = computed<Tema>(() => {
    const actual = this.accesibilidad.tema();

    if (actual === 'oscuro') return 'dark';

    if (actual === 'sistema') {
      if (typeof window !== 'undefined') {
        return window.matchMedia(
          '(prefers-color-scheme: dark)'
        ).matches ? 'dark' : 'light';
      }
    }

    return 'light';
  });

  tamanoLetra = computed(() =>
    Math.round(16 * this.accesibilidad.tamanoLetra() / 100)
  );

  cambiarTema(): void {
    const siguiente: TemaAccesibilidad =
      this.tema() === 'light' ? 'oscuro' : 'claro';

    this.accesibilidad.cambiarTema(siguiente);
  }

  aumentarLetra(): void {
    this.accesibilidad.aumentarLetra();
  }

  disminuirLetra(): void {
    this.accesibilidad.disminuirLetra();
  }

  restablecerLetra(): void {
    this.accesibilidad.restaurarLetra();
  }
}
