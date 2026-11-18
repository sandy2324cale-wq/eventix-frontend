
import {
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  input
} from '@angular/core';

import { Accesibilidad } from '../../core/services/accesibilidad';

@Directive({
  selector: '[appDescripcionVoz]',
  standalone: true
})
export class DescripcionVoz {

  private accesibilidad = inject(Accesibilidad);
  private elemento = inject(ElementRef<HTMLElement>);

  appDescripcionVoz = input.required<string>();

  private activacionTeclado = false;

  @HostBinding('class.voz-seleccionado')
  get seleccionado(): boolean {
    return (
      this.accesibilidad.vozActiva() &&
      this.accesibilidad.elementoSeleccionado() ===
        this.elemento.nativeElement
    );
  }

  @HostListener('click', ['$event'])
  alHacerClick(evento: MouseEvent): void {

    if (!this.accesibilidad.vozActiva()) {
      return;
    }

    if (this.activacionTeclado || evento.detail === 0) {
      this.activacionTeclado = false;
      return;
    }

    const permitir = this.accesibilidad.seleccionarElemento(
      this.elemento.nativeElement,
      this.appDescripcionVoz()
    );

    if (!permitir) {
      evento.preventDefault();
      evento.stopImmediatePropagation();
    }
  }

  @HostListener('focus')
  alRecibirFoco(): void {
    this.accesibilidad.explicar(this.appDescripcionVoz());
  }

  @HostListener('keydown', ['$event'])
  alPresionarTecla(evento: KeyboardEvent): void {

    if (evento.key === 'Enter' || evento.key === ' ') {
      this.activacionTeclado = true;
      this.accesibilidad.elementoSeleccionado.set(null);
    }
  }

  @HostListener('blur')
  alPerderFoco(): void {
    this.activacionTeclado = false;
  }
}
