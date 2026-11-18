
import {
  Component,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal
} from '@angular/core';

import { Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { forkJoin, Subscription } from 'rxjs';

import {
  CatalogoPublicoService,
  EventoPublico,
  TipoEntradaPublico
} from '../../core/services/catalogo-publico';

import { AuthService } from '../../core/services/auth';

import {
  Accesibilidad,
  Tema
} from '../../core/services/accesibilidad';

import {
  UsuarioService,
  PerfilUsuario
} from '../../core/services/usuario';

import {
  VentaService,
  EntradaVista,
  ReservaVista,
  CompraVista,
  CompraResumen
} from '../../core/services/venta';

type SeccionCliente =
  | 'inicio'
  | 'entradas'
  | 'reservas'
  | 'compras'
  | 'perfil'
  | 'configuracion';

@Component({
  selector: 'app-cliente',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './cliente.html',
  styleUrl: './cliente.scss'
})
export class Cliente implements OnInit, OnDestroy {

  // ==========================================
  // SERVICIOS
  // ==========================================

  private auth = inject(AuthService);
  private router = inject(Router);
  private usuariosService = inject(UsuarioService);
  private ventasService = inject(VentaService);
  private catalogo = inject(CatalogoPublicoService);

  private suscripciones = new Subscription();
  private qrUrlActual: string | null = null;

  accesibilidad = inject(Accesibilidad);
  usuario = this.auth.usuario;

  // ==========================================
  // NAVEGACIÓN
  // ==========================================

  seccion = signal<SeccionCliente>('inicio');
  menuMovilAbierto = signal(false);

  // ==========================================
  // DATOS DEL CLIENTE
  // ==========================================

  perfil = signal<PerfilUsuario | null>(null);

  entradas = signal<EntradaVista[]>([]);
  reservas = signal<ReservaVista[]>([]);
  compras = signal<CompraResumen[]>([]);

  cargando = signal(false);
  procesandoReserva = signal<number | null>(null);

  error = signal('');
  aviso = signal('');

  // ==========================================
  // CATÁLOGO DE EVENTOS
  // ==========================================

  eventos = signal<EventoPublico[]>([]);
  tipos = signal<TipoEntradaPublico[]>([]);

  busqueda = signal('');
  pagina = signal(0);
  paginas = signal(0);

  catalogoCargando = signal(false);
  catalogoError = signal('');

  seleccionado = signal<EventoPublico | null>(null);
  tipoId = signal<number | null>(null);

  cantidad = signal(1);
  reservando = signal(false);

  imagenFallida = signal<number[]>([]);

  tiposDelEvento = computed(() =>
    this.tipos().filter(
      tipo => tipo.eventoId === this.seleccionado()?.id
    )
  );

  tipoElegido = computed(() =>
    this.tiposDelEvento().find(
      tipo => tipo.id === this.tipoId()
    ) ?? null
  );

  total = computed(() =>
    (this.tipoElegido()?.precio ?? 0) * this.cantidad()
  );

  // ==========================================
  // ENTRADAS Y QR
  // ==========================================

  qrSeleccionado = signal<number | null>(null);
  qrImagen = signal<string | null>(null);

  entradasDisponibles = computed(() =>
    this.entradas().filter(
      entrada => entrada.estado === 'DISPONIBLE'
    ).length
  );

  entradasUtilizadas = computed(() =>
    this.entradas().filter(
      entrada => entrada.estado === 'UTILIZADA'
    ).length
  );

  reservasPendientes = computed(() =>
    this.reservas().filter(
      reserva => reserva.estado === 'PENDIENTE'
    ).length
  );

  reservasConfirmadas = computed(() =>
    this.reservas().filter(
      reserva => reserva.estado === 'CONFIRMADA'
    ).length
  );

  eventosIds = computed(() =>
    [...new Set(this.entradas().map(e => e.eventoId))]
  );

  // ==========================================
  // COMPRAS Y COMPROBANTES
  // ==========================================

  descargando = signal<number | null>(null);

  // ==========================================
  // CICLO DE VIDA
  // ==========================================

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarCatalogo();
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
    this.limpiarQr();
  }

  // ==========================================
  // CARGAR DATOS DEL CLIENTE
  // ==========================================

  cargarDatos(): void {

    this.cargando.set(true);
    this.error.set('');

    const sub = forkJoin({
      perfil: this.usuariosService.obtenerMiPerfil(),
      entradas: this.ventasService.misEntradas(),
      reservas: this.ventasService.misReservas(),
      compras: this.ventasService.misCompras()
    }).subscribe({

      next: ({ perfil, entradas, reservas, compras }) => {

        this.perfil.set(perfil);
        this.entradas.set(entradas);
        this.reservas.set(reservas);
        this.compras.set(compras);

        this.cargando.set(false);
      },

      error: e => {
        this.cargando.set(false);

        this.error.set(
          this.mensajeError(
            e,
            'No se pudieron actualizar los datos. Intenta de nuevo.'
          )
        );
      }
    });

    this.suscripciones.add(sub);
  }

  // ==========================================
  // CAMBIAR SECCIÓN
  // ==========================================

  cambiarSeccion(seccion: SeccionCliente): void {

    this.seccion.set(seccion);
    this.menuMovilAbierto.set(false);

    this.error.set('');
    this.aviso.set('');

    if (seccion === 'inicio') {
      this.cargarCatalogo();
    }

    if (
      seccion === 'entradas' ||
      seccion === 'reservas' ||
      seccion === 'compras'
    ) {
      this.cargarDatos();
    }
  }

  // ==========================================
  // CONFIGURACIÓN
  // ==========================================

  seleccionarTema(tema: Tema): void {
    this.accesibilidad.cambiarTema(tema);
  }

  // ==========================================
  // NORMALIZAR PORTADAS
  // ==========================================

  urlPortada(
    imagenUrl: string | null | undefined
  ): string | null {

    if (!imagenUrl?.trim()) {
      return null;
    }

    const url = imagenUrl.trim();

    // URL externa completa
    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    // Ruta relativa enviada por Spring Boot
    return `https://eventix-backend-production-4e1dd560.up.railway.app/${url.replace(/^\/+/, '')}`;
  }

  // ==========================================
  // MOSTRAR CÓDIGO QR
  // ==========================================

  mostrarQr(entrada: EntradaVista): void {

    this.limpiarQr();
    this.error.set('');

    const sub = this.ventasService.obtenerQr(entrada.id).subscribe({

      next: blob => {

        this.qrUrlActual = URL.createObjectURL(blob);

        this.qrImagen.set(this.qrUrlActual);
        this.qrSeleccionado.set(entrada.id);
      },

      error: e => {

        this.error.set(
          this.mensajeError(
            e,
            'No se pudo cargar el código QR.'
          )
        );
      }
    });

    this.suscripciones.add(sub);
  }

  limpiarQr(): void {

    if (this.qrUrlActual) {
      URL.revokeObjectURL(this.qrUrlActual);
    }

    this.qrUrlActual = null;

    this.qrImagen.set(null);
    this.qrSeleccionado.set(null);
  }

  // ==========================================
  // CANCELAR RESERVA
  // ==========================================

  cancelarReserva(reserva: ReservaVista): void {

    if (
      reserva.estado !== 'PENDIENTE' ||
      this.procesandoReserva() !== null
    ) {
      return;
    }

    if (
      !confirm(
        '¿Quieres cancelar esta reserva? Los cupos volverán a estar disponibles.'
      )
    ) {
      return;
    }

    this.error.set('');
    this.aviso.set('');
    this.procesandoReserva.set(reserva.id);

    const sub = this.ventasService.cancelarReserva(
      reserva.id
    ).subscribe({

      next: () => {

        this.procesandoReserva.set(null);

        this.cargarDatos();

        this.aviso.set(
          'Reserva cancelada. Los cupos fueron liberados.'
        );
      },

      error: e => {

        this.procesandoReserva.set(null);

        this.error.set(
          this.mensajeError(
            e,
            'No se pudo cancelar la reserva.'
          )
        );
      }
    });

    this.suscripciones.add(sub);
  }

  // ==========================================
  // CONFIRMAR COMPRA SIMULADA
  // ==========================================

  confirmarCompra(reserva: ReservaVista): void {

    if (
      reserva.estado !== 'PENDIENTE' ||
      this.procesandoReserva() !== null
    ) {
      return;
    }

    if (
      !confirm(
        'Esta es una compra SIMULADA, sin cobro bancario. ¿Confirmar y emitir las entradas?'
      )
    ) {
      return;
    }

    this.error.set('');
    this.aviso.set('');
    this.procesandoReserva.set(reserva.id);

    const sub = this.ventasService.confirmarCompra(
      reserva.id
    ).subscribe({

      next: (compra: CompraVista) => {

        this.procesandoReserva.set(null);

        this.cargarDatos();

        this.aviso.set(
          `Compra simulada #${compra.id} confirmada. Total: $${Number(compra.total).toFixed(2)}. Ya puedes consultar tus entradas.`
        );
      },

      error: e => {

        this.procesandoReserva.set(null);

        this.error.set(
          this.mensajeError(
            e,
            'No se pudo confirmar la compra. Comprueba si la reserva expiró.'
          )
        );
      }
    });

    this.suscripciones.add(sub);
  }

  // ==========================================
  // CARGAR CATÁLOGO
  // ==========================================

  cargarCatalogo(): void {

    this.catalogoCargando.set(true);
    this.catalogoError.set('');

    const sub = forkJoin({

      eventos: this.catalogo.eventos(
        this.busqueda(),
        this.pagina(),
        9
      ),

      tipos: this.catalogo.tipos(0, 100)

    }).subscribe({

      next: ({ eventos, tipos }) => {

        this.eventos.set(eventos.content);
        this.paginas.set(eventos.totalPages);
        this.tipos.set(tipos.content);

        this.catalogoCargando.set(false);
      },

      error: e => {

        this.catalogoError.set(
          this.mensajeError(
            e,
            'No se pudo cargar el catálogo.'
          )
        );

        this.catalogoCargando.set(false);
      }
    });

    this.suscripciones.add(sub);
  }

  // ==========================================
  // BUSCAR EVENTOS
  // ==========================================

  buscar(texto: string): void {

    this.busqueda.set(texto.trim());
    this.pagina.set(0);

    this.cargarCatalogo();
  }

  cambiarPagina(delta: number): void {

    const siguiente = this.pagina() + delta;

    if (
      siguiente >= 0 &&
      siguiente < this.paginas()
    ) {
      this.pagina.set(siguiente);
      this.cargarCatalogo();
    }
  }

  // ==========================================
  // SELECCIONAR EVENTO
  // ==========================================

  abrirEvento(evento: EventoPublico): void {

    this.seleccionado.set(evento);

    this.tipoId.set(null);
    this.cantidad.set(1);

    this.catalogoError.set('');
  }

  cerrarEvento(): void {
    this.seleccionado.set(null);
  }

  elegirTipo(id: number): void {

    this.tipoId.set(id || null);
    this.cantidad.set(1);
  }

  cambiarCantidad(valor: string): void {

    this.cantidad.set(
      Math.max(
        1,
        Math.min(10, Number(valor) || 1)
      )
    );
  }

  falloImagen(id: number): void {

    this.imagenFallida.update(ids =>
      ids.includes(id)
        ? ids
        : [...ids, id]
    );
  }

  // ==========================================
  // CREAR RESERVA
  // ==========================================

  reservarEvento(): void {

    const tipo = this.tipoElegido();

    if (!tipo || this.reservando()) {
      return;
    }

    if (this.cantidad() > tipo.cantidadDisponible) {

      this.catalogoError.set(
        'No hay suficientes entradas disponibles.'
      );

      return;
    }

    this.reservando.set(true);
    this.catalogoError.set('');

    const sub = this.ventasService.reservar(
      tipo.id,
      this.cantidad()
    ).subscribe({

      next: () => {

        this.reservando.set(false);

        this.cerrarEvento();
        this.cambiarSeccion('reservas');

        this.aviso.set(
          'Reserva creada. Confirma tu compra simulada antes de que expire.'
        );
      },

      error: e => {

        this.reservando.set(false);

        this.catalogoError.set(
          this.mensajeError(
            e,
            'No se pudo realizar la reserva.'
          )
        );
      }
    });

    this.suscripciones.add(sub);
  }

  // ==========================================
  // DESCARGAR COMPROBANTE PDF
  // ==========================================

  descargarComprobante(compra: CompraResumen): void {

    if (this.descargando() !== null) {
      return;
    }

    this.descargando.set(compra.id);
    this.error.set('');

    const sub = this.ventasService.comprobantePdf(
      compra.id
    ).subscribe({

      next: blob => {

        const url = URL.createObjectURL(blob);

        const enlace = document.createElement('a');

        enlace.href = url;

        enlace.download =
          `Eventix-EVX-${String(compra.id).padStart(6, '0')}.pdf`;

        document.body.appendChild(enlace);

        enlace.click();
        enlace.remove();

        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);

        this.descargando.set(null);
      },

      error: e => {

        this.descargando.set(null);

        this.error.set(
          this.mensajeError(
            e,
            'No se pudo descargar el comprobante.'
          )
        );
      }
    });

    this.suscripciones.add(sub);
  }

  // ==========================================
  // MANEJAR ERRORES
  // ==========================================

  private mensajeError(
    e: any,
    alternativo: string
  ): string {

    return (
      e?.error?.message ||
      e?.error?.mensaje ||
      alternativo
    );
  }

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  cerrarSesion(): void {

    this.accesibilidad.detener();

    this.limpiarQr();

    this.auth.cerrarSesion();

    this.router.navigateByUrl('/login');
  }
}
