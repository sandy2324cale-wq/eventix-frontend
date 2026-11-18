
import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/services/auth';
import { Accesibilidad } from '../../core/services/accesibilidad';

import {
  AdminService,
  UsuarioAdmin,
  SolicitudOrganizador,
  UbicacionAdmin,
  EventoAdmin,
  UbicacionRequest,
  ApelacionAdmin,
  AuditoriaAdmin
} from '../../core/services/admin';

// ==========================================
// SECCIONES DEL ADMINISTRADOR
// ==========================================

type SeccionAdmin =
  | 'resumen'
  | 'solicitudes'
  | 'usuarios'
  | 'apelaciones'
  | 'ubicaciones'
  | 'eventos'
  | 'auditoria'
  | 'configuracion';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss'
})
export class Admin implements OnInit {

  // ==========================================
  // SERVICIOS
  // ==========================================

  private adminService = inject(AdminService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly accesibilidad = inject(Accesibilidad);

  // ==========================================
  // NAVEGACIÓN
  // ==========================================

  seccion = signal<SeccionAdmin>('resumen');
  menuAbierto = signal(false);

  // ==========================================
  // DATOS DEL BACKEND
  // ==========================================

  auditorias = signal<AuditoriaAdmin[]>([]);
  paginaAuditorias = signal(0);
  totalAuditorias = signal(0);
  totalPaginasAuditorias = signal(0);
  cargandoAuditorias = signal(false);
  errorAuditorias = signal('');
  usuarios = signal<UsuarioAdmin[]>([]);
  apelaciones = signal<ApelacionAdmin[]>([]);
  totalApelaciones = signal(0);
  paginaApelaciones = signal(0);
  totalPaginasApelaciones = signal(0);
  usuarioBloqueo = signal<UsuarioAdmin | null>(null);
  motivoBloqueo = "";
  apelacionResolver = signal<ApelacionAdmin | null>(null);
  respuestaApelacion = "";
  aprobarApelacion = false;
  solicitudes = signal<SolicitudOrganizador[]>([]);
  ubicaciones = signal<UbicacionAdmin[]>([]);
  eventos = signal<EventoAdmin[]>([]);

  cargando = signal(false);
  procesando = signal(false);

  error = signal('');
  mensaje = signal('');

  // ==========================================
  // BÚSQUEDAS
  // ==========================================

  busquedaUsuarios = '';
  busquedaEventos = '';

  private busquedaUsuariosSignal = signal('');
  private busquedaEventosSignal = signal('');

  usuariosFiltrados = computed(() => {

    const texto = this.busquedaUsuariosSignal()
      .toLowerCase()
      .trim();

    return this.usuarios().filter(usuario => {

      const contenido = [
        usuario.nombre,
        usuario.apellidos,
        usuario.correo,
        usuario.rol
      ].join(' ').toLowerCase();

      return contenido.includes(texto);
    });
  });

  eventosFiltrados = computed(() => {

    const texto = this.busquedaEventosSignal()
      .toLowerCase()
      .trim();

    return this.eventos().filter(evento => {

      const contenido = [
        evento.titulo,
        evento.estado
      ].join(' ').toLowerCase();

      return contenido.includes(texto);
    });
  });

  // ==========================================
  // RECHAZO DE ORGANIZADORES
  // ==========================================

  motivoRechazo = '';

  solicitudRechazo =
    signal<SolicitudOrganizador | null>(null);

  // ==========================================
  // UBICACIONES
  // ==========================================



  // ==========================================
  // PAGINACIÓN
  // ==========================================

  paginaUsuarios = signal(0);
  totalPaginasUsuarios = signal(0);
  totalUsuarios = signal(0);

  paginaSolicitudes = signal(0);
  totalPaginasSolicitudes = signal(0);
  totalSolicitudes = signal(0);

  paginaUbicaciones = signal(0);
  totalPaginasUbicaciones = signal(0);
  totalUbicaciones = signal(0);

  paginaEventos = signal(0);
  totalPaginasEventos = signal(0);
  totalEventos = signal(0);

  readonly tamanoPagina = 10;

  // ==========================================
  // INICIALIZACIÓN
  // ==========================================

  ngOnInit(): void {
    this.cargarTodo();
  }

  // ==========================================
  // NAVEGACIÓN DEL MENÚ
  // ==========================================

  cambiarSeccion(seccion: SeccionAdmin): void {

    this.seccion.set(seccion);

    if (seccion === 'auditoria') {
      this.cargarAuditorias(0);
    }
    this.menuAbierto.set(false);

    this.limpiarMensajes();
  }

  nombreSeccion(): string {

    const nombres: Record<SeccionAdmin, string> = {
      resumen: 'Panel de administración',
      solicitudes: 'Solicitudes de organizadores',
      usuarios: 'Gestión de usuarios',
      apelaciones: 'Apelaciones de cuentas',
      ubicaciones: 'Gestión de ubicaciones',
      eventos: 'Gestión de eventos',
      auditoria: 'Auditoría del sistema',
      configuracion: 'Configuración'
    };

    return nombres[this.seccion()];
  }

  // ==========================================
  // ACTUALIZAR BÚSQUEDAS
  // ==========================================

  actualizarBusquedaUsuarios(texto: string): void {

    this.busquedaUsuarios = texto;
    this.busquedaUsuariosSignal.set(texto);
  }

  actualizarBusquedaEventos(texto: string): void {

    this.busquedaEventos = texto;
    this.busquedaEventosSignal.set(texto);
  }

  // ==========================================
  // CARGAR INFORMACIÓN GENERAL
  // ==========================================

  cargarTodo(): void {

    this.cargarUsuarios();
    this.cargarSolicitudes();
    this.cargarApelaciones();
    this.cargarUbicaciones();
    this.cargarEventos();
    if (this.seccion() === 'auditoria') {
      this.cargarAuditorias(this.paginaAuditorias());
    }
  }

  // ==========================================
  // CONSULTAR USUARIOS
  // ==========================================

  cargarUsuarios(page = 0): void {

    this.cargando.set(true);

    this.adminService
      .listarUsuarios(page, this.tamanoPagina)
      .subscribe({

        next: respuesta => {

          this.usuarios.set(respuesta.content);

          this.totalUsuarios.set(
            respuesta.totalElements
          );

          this.paginaUsuarios.set(
            respuesta.number
          );

          this.totalPaginasUsuarios.set(
            respuesta.totalPages
          );

          this.cargando.set(false);
        },

        error: err => this.mostrarError(err)
      });
  }

  // ==========================================
  // CONSULTAR SOLICITUDES PENDIENTES
  // ==========================================

  cargarSolicitudes(page = 0): void {

    this.cargando.set(true);

    this.adminService
      .listarPendientes(page, this.tamanoPagina)
      .subscribe({

        next: respuesta => {

          this.solicitudes.set(
            respuesta.content
          );

          this.totalSolicitudes.set(
            respuesta.totalElements
          );

          this.paginaSolicitudes.set(
            respuesta.number
          );

          this.totalPaginasSolicitudes.set(
            respuesta.totalPages
          );

          this.cargando.set(false);
        },

        error: err => this.mostrarError(err)
      });
  }

  // ==========================================
  // CONSULTAR UBICACIONES
  // ==========================================

  cargarUbicaciones(page = 0): void {

    this.cargando.set(true);

    this.adminService
      .listarUbicaciones(page, this.tamanoPagina)
      .subscribe({

        next: respuesta => {

          this.ubicaciones.set(
            respuesta.content
          );

          this.totalUbicaciones.set(
            respuesta.totalElements
          );

          this.paginaUbicaciones.set(
            respuesta.number
          );

          this.totalPaginasUbicaciones.set(
            respuesta.totalPages
          );

          this.cargando.set(false);
        },

        error: err => this.mostrarError(err)
      });
  }

  // ==========================================
  // CONSULTAR EVENTOS
  // ==========================================

  cargarEventos(page = 0): void {

    this.cargando.set(true);

    this.adminService
      .listarEventos(page, this.tamanoPagina)
      .subscribe({

        next: respuesta => {

          this.eventos.set(
            respuesta.content
          );

          this.totalEventos.set(
            respuesta.totalElements
          );

          this.paginaEventos.set(
            respuesta.number
          );

          this.totalPaginasEventos.set(
            respuesta.totalPages
          );

          this.cargando.set(false);
        },

        error: err => this.mostrarError(err)
      });
  }

  // ==========================================
  // APROBAR ORGANIZADOR
  // ==========================================

  aprobar(solicitud: SolicitudOrganizador): void {

    if (this.procesando()) return;

    const confirmar = window.confirm(
      `¿Deseas aprobar a "${solicitud.nombre}"?`
    );

    if (!confirmar) return;

    this.procesando.set(true);
    this.limpiarMensajes();

    this.adminService
      .aprobarOrganizador(solicitud.id)
      .subscribe({

        next: () => {

          this.procesando.set(false);

          this.mensaje.set(
            `La organización "${solicitud.nombre}" fue aprobada.`
          );

          this.cargarSolicitudes(
            this.paginaSolicitudes()
          );
        },

        error: err => this.mostrarError(err)
      });
  }

  // ==========================================
  // ABRIR MODAL DE RECHAZO
  // ==========================================

  abrirRechazo(
    solicitud: SolicitudOrganizador
  ): void {

    this.solicitudRechazo.set(solicitud);
    this.motivoRechazo = '';

    this.limpiarMensajes();
  }

  cerrarRechazo(): void {

    this.solicitudRechazo.set(null);
    this.motivoRechazo = '';
  }

  // ==========================================
  // CONFIRMAR RECHAZO
  // ==========================================

  confirmarRechazo(): void {

    if (this.procesando()) return;

    const solicitud = this.solicitudRechazo();
    const motivo = this.motivoRechazo.trim();

    if (!solicitud) return;

    if (
      motivo.length === 0 ||
      motivo.length > 500
    ) {

      this.error.set(
        'Ingresa un motivo de rechazo de 1 a 500 caracteres.'
      );

      return;
    }

    this.procesando.set(true);
    this.limpiarMensajes();

    this.adminService
      .rechazarOrganizador(
        solicitud.id,
        motivo
      )
      .subscribe({

        next: () => {

          this.procesando.set(false);
          this.cerrarRechazo();

          this.mensaje.set(
            `La solicitud de "${solicitud.nombre}" fue rechazada.`
          );

          this.cargarSolicitudes(
            this.paginaSolicitudes()
          );
        },

        error: err => this.mostrarError(err)
      });
  }

  // ==========================================
  // PAGINACIÓN DE TABLAS
  // ==========================================

  cambiarPagina(
    tipo: 'usuarios' | 'solicitudes' | 'ubicaciones' | 'eventos' | 'apelaciones',
    pagina: number
  ): void {

    if (pagina < 0) return;

    switch (tipo) {

      case 'apelaciones':
        if (pagina < this.totalPaginasApelaciones()) this.cargarApelaciones(pagina);
        break;

      case 'usuarios':

        if (pagina < this.totalPaginasUsuarios()) {
          this.cargarUsuarios(pagina);
        }

        break;

      case 'solicitudes':

        if (pagina < this.totalPaginasSolicitudes()) {
          this.cargarSolicitudes(pagina);
        }

        break;

      case 'ubicaciones':

        if (pagina < this.totalPaginasUbicaciones()) {
          this.cargarUbicaciones(pagina);
        }

        break;

      case 'eventos':

        if (pagina < this.totalPaginasEventos()) {
          this.cargarEventos(pagina);
        }

        break;
    }
  }

  // ==========================================
  // ACCESIBILIDAD
  // ==========================================

  cambiarTema(
    tema: 'oscuro' | 'claro' | 'sistema'
  ): void {

    this.accesibilidad.cambiarTema(tema);
  }

  cargarApelaciones(page = 0): void {
    this.adminService.listarApelaciones(page, this.tamanoPagina).subscribe({
      next: r => {
        this.apelaciones.set(r.content);
        this.totalApelaciones.set(r.totalElements);
        this.paginaApelaciones.set(r.number);
        this.totalPaginasApelaciones.set(r.totalPages);
      },
      error: err => this.mostrarError(err)
    });
  }

  abrirBloqueo(usuario: UsuarioAdmin): void {
    this.usuarioBloqueo.set(usuario);
    this.motivoBloqueo = '';
    this.limpiarMensajes();
  }

  confirmarBloqueo(): void {
    const u = this.usuarioBloqueo();
    const motivo = this.motivoBloqueo.trim();
    if (!u || this.procesando()) return;
    if (motivo.length < 5 || motivo.length > 500) {
      this.error.set('El motivo debe tener entre 5 y 500 caracteres.');
      return;
    }
    this.procesando.set(true);
    this.adminService.bloquearUsuario(u.id, motivo).subscribe({
      next: () => {
        this.procesando.set(false);
        this.usuarioBloqueo.set(null);
        this.mensaje.set('Cuenta bloqueada correctamente.');
        this.cargarUsuarios(this.paginaUsuarios());
      }, error: err => this.mostrarError(err)
    });
  }

  desbloquearUsuario(u: UsuarioAdmin): void {
    if (this.procesando() || !window.confirm(`¿Desbloquear a ${u.nombre}?`)) return;
    this.procesando.set(true);
    this.adminService.desbloquearUsuario(u.id).subscribe({
      next: () => {
        this.procesando.set(false);
        this.mensaje.set('Cuenta desbloqueada.');
        this.cargarUsuarios(this.paginaUsuarios());
        this.cargarApelaciones(this.paginaApelaciones());
      }, error: err => this.mostrarError(err)
    });
  }

  abrirResolverApelacion(a: ApelacionAdmin, aprobar: boolean): void {
    this.apelacionResolver.set(a);
    this.aprobarApelacion = aprobar;
    this.respuestaApelacion = '';
    this.limpiarMensajes();
  }

  confirmarResolverApelacion(): void {
    const a = this.apelacionResolver();
    const respuesta = this.respuestaApelacion.trim();
    if (!a || this.procesando()) return;
    if (respuesta.length < 5 || respuesta.length > 1000) {
      this.error.set('La respuesta debe tener entre 5 y 1000 caracteres.');
      return;
    }
    this.procesando.set(true);
    this.adminService.resolverApelacion(a.id, this.aprobarApelacion, respuesta).subscribe({
      next: () => {
        this.procesando.set(false);
        this.apelacionResolver.set(null);
        this.mensaje.set(this.aprobarApelacion ? 'Apelación aprobada y cuenta desbloqueada.' : 'Apelación rechazada.');
        this.cargarApelaciones(this.paginaApelaciones());
        this.cargarUsuarios(this.paginaUsuarios());
      }, error: err => this.mostrarError(err)
    });
  }

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  cargarAuditorias(page = 0): void {
    this.cargandoAuditorias.set(true);
    this.errorAuditorias.set('');

    this.adminService
      .listarAuditorias(page, this.tamanoPagina)
      .subscribe({
        next: respuesta => {
          this.auditorias.set(respuesta.content);
          this.paginaAuditorias.set(respuesta.number);
          this.totalAuditorias.set(respuesta.totalElements);
          this.totalPaginasAuditorias.set(respuesta.totalPages);
          this.cargandoAuditorias.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.cargandoAuditorias.set(false);
          this.errorAuditorias.set(
            err.error?.message ||
            'No se pudo consultar la auditoría.'
          );
        }
      });
  }

  cambiarPaginaAuditoria(pagina: number): void {
    if (
      pagina < 0 ||
      pagina >= this.totalPaginasAuditorias()
    ) {
      return;
    }

    this.cargarAuditorias(pagina);
  }
  cerrarSesion(): void {

    this.auth.cerrarSesion();

    this.router.navigateByUrl('/login');
  }

  // ==========================================
  // MENSAJES
  // ==========================================

  private limpiarMensajes(): void {

    this.error.set('');
    this.mensaje.set('');
  }

  private mostrarError(
    err: HttpErrorResponse
  ): void {

    this.procesando.set(false);
    this.cargando.set(false);

    const mensaje =
      err.error?.message ||
      err.error?.mensaje ||
      (typeof err.error === 'string'
        ? err.error
        : null) ||
      'No se pudo completar la operación. Revisa el backend.';

    this.error.set(mensaje);
  }
}
