import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';

import {
  CatalogoPublicoService,
  EventoPublico,
  TipoEntradaPublico
} from '../../core/services/catalogo-publico';

import { VentaService } from '../../core/services/venta';
import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss'
})
export class Catalogo implements OnInit {

  private readonly catalogo = inject(CatalogoPublicoService);
  private readonly venta = inject(VentaService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  eventos = signal<EventoPublico[]>([]);
  tipos = signal<TipoEntradaPublico[]>([]);

  busqueda = signal('');
  pagina = signal(0);
  paginas = signal(1);

  cargando = signal(false);
  procesando = signal(false);
  error = signal('');

  seleccionado = signal<EventoPublico | null>(null);
  tipoElegido = signal<TipoEntradaPublico | null>(null);
  cantidad = signal(1);

  tiposDelEvento = computed(() => {
    const evento = this.seleccionado();

    if (!evento) {
      return [];
    }

    return this.tipos().filter(
      tipo => tipo.eventoId === evento.id
    );
  });

  total = computed(() => {
    const tipo = this.tipoElegido();

    if (!tipo) {
      return 0;
    }

    return tipo.precio * this.cantidad();
  });

  ngOnInit(): void {
    this.cargarEventos();
    this.cargarTipos();
  }

  cargarEventos(): void {
    this.cargando.set(true);
    this.error.set('');

    this.catalogo.eventos(
      this.busqueda(),
      this.pagina()
    ).subscribe({
      next: respuesta => {
        this.eventos.set(respuesta.content);
        this.paginas.set(Math.max(1, respuesta.totalPages));
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los eventos.');
        this.cargando.set(false);
      }
    });
  }

  cargarTipos(): void {
    this.catalogo.tipos(0, 100).subscribe({
      next: respuesta => {
        this.tipos.set(respuesta.content);
      },
      error: () => {
        this.error.set('No se pudieron cargar los tipos de entrada.');
      }
    });
  }

  buscar(texto: string): void {
    this.busqueda.set(texto.trim());
    this.pagina.set(0);
    this.cargarEventos();
  }

  cambiarPagina(direccion: number): void {
    const nuevaPagina = this.pagina() + direccion;

    if (
      nuevaPagina < 0 ||
      nuevaPagina >= this.paginas()
    ) {
      return;
    }

    this.pagina.set(nuevaPagina);
    this.cargarEventos();
  }

  abrir(evento: EventoPublico): void {
    this.seleccionado.set(evento);
    this.tipoElegido.set(null);
    this.cantidad.set(1);
    this.error.set('');
  }

  cerrar(): void {
    this.seleccionado.set(null);
    this.tipoElegido.set(null);
    this.cantidad.set(1);
    this.error.set('');
  }

  elegirTipo(id: number): void {
    const tipo = this.tiposDelEvento().find(
      t => t.id === id
    );

    this.tipoElegido.set(tipo ?? null);
    this.cantidad.set(1);
  }

  cambiarCantidad(valor: string): void {
    const numero = Number(valor);
    const maximo = Math.min(
      10,
      this.tipoElegido()?.cantidadDisponible ?? 10
    );

    if (!Number.isFinite(numero)) {
      this.cantidad.set(1);
      return;
    }

    this.cantidad.set(
      Math.max(1, Math.min(maximo, Math.trunc(numero)))
    );
  }

  reservar(): void {
    const tipo = this.tipoElegido();

    if (!tipo || this.procesando()) {
      return;
    }

    const cantidad = this.cantidad();

    if (
      cantidad < 1 ||
      cantidad > 10 ||
      cantidad > tipo.cantidadDisponible
    ) {
      this.error.set('Cantidad de entradas no válida.');
      return;
    }

    this.procesando.set(true);
    this.error.set('');

    this.venta.reservar(tipo.id, cantidad).subscribe({
      next: () => {
        this.procesando.set(false);
        this.cerrar();

        this.router.navigateByUrl('/cliente');
      },
      error: err => {
        this.procesando.set(false);

        if (err.status === 401 || err.status === 403) {
          this.error.set(
            'Inicia sesión con una cuenta de cliente para reservar.'
          );
          return;
        }

        this.error.set(
          err.error?.message ||
          'No se pudo realizar la reserva.'
        );
      }
    });
  }
}