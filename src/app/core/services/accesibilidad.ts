
import {
  Injectable,
  signal,
  effect,
  NgZone,
  inject
} from '@angular/core';

export type Tema = 'oscuro' | 'claro' | 'sistema';

@Injectable({
  providedIn: 'root'
})
export class Accesibilidad {

  private readonly zone = inject(NgZone);

  tema = signal<Tema>('claro');
  tamanoLetra = signal(100);

  vozActiva = signal(false);
  leyendo = signal(false);

  elementoSeleccionado = signal<HTMLElement | null>(null);

  private sintetizador: SpeechSynthesis | null =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window
      ? window.speechSynthesis
      : null;

  constructor() {

    if (typeof window !== 'undefined') {
      const temaGuardado =
        localStorage.getItem('eventix-tema');

      const letraGuardada =
        Number(localStorage.getItem('eventix-letra'));

      if (
        temaGuardado === 'oscuro' ||
        temaGuardado === 'claro' ||
        temaGuardado === 'sistema'
      ) {
        this.tema.set(temaGuardado);
      } else if (temaGuardado === 'dark') {
        this.tema.set('oscuro');
      } else if (temaGuardado === 'light') {
        this.tema.set('claro');
      }

      if (Number.isFinite(letraGuardada)) {
        if (letraGuardada >= 80 &&
            letraGuardada <= 150) {
          this.tamanoLetra.set(letraGuardada);
        } else if (
          letraGuardada >= 14 &&
          letraGuardada <= 20
        ) {
          this.tamanoLetra.set(
            Math.round(letraGuardada / 16 * 100)
          );
        }
      }
    }

    effect(() => {
      const temaActual = this.tema();
      const porcentaje = this.tamanoLetra();

      if (typeof document === 'undefined') return;

      const html = document.documentElement;

      html.dataset['tema'] = temaActual;

      html.style.setProperty(
        '--tamano-base',
        `${16 * porcentaje / 100}px`
      );

      // Compatibilidad con estilos antiguos.
      html.dataset['theme'] =
        temaActual === 'oscuro' ? 'dark' : 'light';

      localStorage.setItem('eventix-tema', temaActual);
      localStorage.setItem(
        'eventix-letra',
        String(porcentaje)
      );
    });

    if (typeof document !== 'undefined') {
      document.addEventListener(
        'click',
        this.interceptarClick,
        true
      );
    }
  }

  cambiarTema(tema: Tema): void {
    this.tema.set(tema);
  }

  aumentarLetra(): void {
    this.tamanoLetra.update(
      valor => Math.min(valor + 10, 150)
    );
  }

  disminuirLetra(): void {
    this.tamanoLetra.update(
      valor => Math.max(valor - 10, 80)
    );
  }

  restaurarLetra(): void {
    this.tamanoLetra.set(100);
  }

  activarVoz(): void {
    this.vozActiva.set(true);
    this.elementoSeleccionado.set(null);

    this.hablar(
      'Asistente de Eventix activado. ' +
      'Selecciona un botón o enlace para escuchar su descripción. ' +
      'Selecciona el mismo elemento nuevamente para utilizarlo.'
    );
  }

  desactivarVoz(): void {
    this.vozActiva.set(false);
    this.limpiarSeleccion();
    this.detener();
  }

  alternarLectura(): void {
    if (this.vozActiva()) {
      this.desactivarVoz();
    } else {
      this.activarVoz();
    }
  }

  seleccionarElemento(
    elemento: HTMLElement,
    descripcion: string
  ): boolean {

    if (!this.vozActiva()) return true;

    if (this.elementoSeleccionado() === elemento) {
      this.limpiarSeleccion();
      this.detener();
      return true;
    }

    this.limpiarSeleccion();

    this.elementoSeleccionado.set(elemento);
    elemento.classList.add('voz-seleccionado');

    this.hablar(descripcion);

    return false;
  }

  private limpiarSeleccion(): void {
    this.elementoSeleccionado()
      ?.classList.remove('voz-seleccionado');

    this.elementoSeleccionado.set(null);
  }

  private interceptarClick = (evento: MouseEvent): void => {

    if (!this.vozActiva()) return;

    const objetivo = evento.target;

    if (!(objetivo instanceof Element)) return;

    // No interceptar los controles del propio asistente.
    if (
      objetivo.closest(
        '.boton-voz, .accesibilidad'
      )
    ) {
      return;
    }

    const elemento = objetivo.closest<HTMLElement>(
      'button, a, input, select, textarea'
    );

    if (!elemento || elemento.hasAttribute('disabled')) {
      return;
    }

    // Permitir la interacción normal con teclado.
    if (evento.detail === 0) return;

    const descripcion =
      elemento.getAttribute('aria-label') ||
      elemento.getAttribute('title') ||
      elemento.innerText?.trim() ||
      elemento.getAttribute('placeholder') ||
      'Elemento interactivo';

    const permitir = this.zone.run(() =>
      this.seleccionarElemento(elemento, descripcion)
    );

    if (!permitir) {
      evento.preventDefault();
      evento.stopImmediatePropagation();
    }
  };

  explicar(texto: string): void {
    if (this.vozActiva()) {
      this.hablar(texto);
    }
  }

  hablar(texto: string): void {

    if (!this.sintetizador || !texto.trim()) return;

    this.sintetizador.cancel();
    this.leyendo.set(false);

    const mensaje = new SpeechSynthesisUtterance(texto);

    mensaje.lang = 'es-EC';
    mensaje.rate = 0.95;
    mensaje.pitch = 1;
    mensaje.volume = 1;

    mensaje.onstart = () => {
      this.zone.run(() => this.leyendo.set(true));
    };

    mensaje.onend = () => {
      this.zone.run(() => this.leyendo.set(false));
    };

    mensaje.onerror = () => {
      this.zone.run(() => this.leyendo.set(false));
    };

    this.sintetizador.speak(mensaje);
  }

  detener(): void {
    this.sintetizador?.cancel();
    this.leyendo.set(false);
  }
}
