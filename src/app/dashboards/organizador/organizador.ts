import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';

import { AuthService } from '../../core/services/auth';
import {
  OrganizadorService,
  MiOrganizacion,
  Ubicacion,
  UbicacionRequest,
  Evento,
  EventoRequest,
  TipoEntrada,
  TipoEntradaRequest, PersonalVista, CrearPersonalRequest
} from '../../core/services/organizador';

type Seccion = 'resumen' | 'ubicaciones' | 'eventos' | 'entradas' | 'personal';
type EstadoEditable = 'PUBLICADO' | 'CERRADO' | 'CANCELADO';

@Component({
  selector: 'app-organizador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './organizador.html',
  styleUrl: './organizador.scss'
})
export class Organizador implements OnInit {
  private readonly api = inject(OrganizadorService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // NAVEGACIÓN Y MENSAJES
  seccion = signal<Seccion>('resumen');
  menuAbierto = signal(false);
  error = signal('');
  mensaje = signal('');
  cargando = signal(false);
  procesando = signal(false);

  // Organización identificada automáticamente mediante el JWT
  organizadorId = signal<number | null>(null);
  nombreOrganizacion = signal('');
  organizacion = signal<MiOrganizacion | null>(null);

  // DATOS
  ubicaciones = signal<Ubicacion[]>([]);
  eventos = signal<Evento[]>([]);
  tipos = signal<TipoEntrada[]>([]);
  personal = signal<PersonalVista[]>([]);
  imagenArchivo: File | null = null;
  personalForm: CrearPersonalRequest = {nombre:'', apellidos:'', cedula:'', telefono:'', correo:''};
  asignacionPersonalId = 0;
  asignacionEventoId = 0;
  totalUbicaciones = signal(0);
  totalEventos = signal(0);
  totalTipos = signal(0);

  misUbicaciones = computed(() =>
    this.ubicaciones().filter(u => this.organizadorId() !== null && u.organizadorId === this.organizadorId())
  );
  misEventos = computed(() =>
    this.eventos().filter(e => this.organizadorId() !== null && e.organizadorId === this.organizadorId())
  );
  misTipos = computed(() => {
    const ids = new Set(this.misEventos().map(e => e.id));
    return this.tipos().filter(t => ids.has(t.eventoId));
  });
  totalDisponibles = computed(() =>
    this.misTipos().reduce((total, t) => total + t.cantidadDisponible, 0)
  );

  // FORMULARIOS
  mostrarUbicacion = signal(false);
  editandoUbicacion = signal<number | null>(null);
  ubicacionForm: UbicacionRequest = this.ubicacionVacia();

  mostrarEvento = signal(false);
  editandoEvento = signal<number | null>(null);
  eventoForm: EventoRequest = this.eventoVacio();

  mostrarTipo = signal(false);
  tipoForm: TipoEntradaRequest = this.tipoVacio();

  // PANEL DE DETALLES DEL EVENTO
  eventoSeleccionadoId = signal<number | null>(null);
  eventoSeleccionado = computed(() =>
    this.misEventos().find(e => e.id === this.eventoSeleccionadoId()) ?? null
  );

  ngOnInit(): void {
    this.cargarMiOrganizacion();
  }

  cargarMiOrganizacion(): void {
    this.cargando.set(true);
    this.limpiar();

    this.api.obtenerMiOrganizacion().subscribe({
      next: organizacion => {
        this.organizacion.set(organizacion);
        this.organizadorId.set(organizacion.id);
        this.nombreOrganizacion.set(organizacion.nombre);
        this.eventoForm.organizadorId = organizacion.id;
        this.cargarTodo();
      },
      error: err => this.mostrarError(err)
    });
  }

  private ubicacionVacia(): UbicacionRequest {
    return { nombre: '', direccion: '', ciudad: '', capacidad: 100 };
  }

  private eventoVacio(): EventoRequest {
    const primeraUbicacion = this.misUbicaciones().find(u => u.activa);
    return {
      titulo: '', descripcion: '', fechaInicio: '', fechaFin: '',
      aforoMaximo: 100,
      organizadorId: this.organizadorId() ?? 0,
      ubicacionId: primeraUbicacion?.id ?? 0
    };
  }

  private tipoVacio(eventoId = 0): TipoEntradaRequest {
    return { eventoId, nombre: 'General', precio: 0, cantidadTotal: 50 };
  }

  nombreSeccion(): string {
    const nombres: Record<Seccion, string> = {
      resumen: 'Panel de organización',
      ubicaciones: 'Mis ubicaciones',
      eventos: 'Mis eventos',
      entradas: 'Tipos de entrada',
      personal: 'Personal de acceso'
    };
    return nombres[this.seccion()];
  }

  cambiarSeccion(seccion: Seccion): void {
    this.seccion.set(seccion);
    this.menuAbierto.set(false);
    this.eventoSeleccionadoId.set(null);
    this.limpiar();
  }

  cargarTodo(): void {
    if (this.organizadorId() === null) {
      this.error.set('No se ha podido identificar tu organización.');
      return;
    }
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      ubicaciones: this.api.listarUbicaciones(),
      eventos: this.api.listarEventos(),
      tipos: this.api.listarTipos()
    }).subscribe({
      next: ({ ubicaciones, eventos, tipos }) => {
        this.ubicaciones.set(ubicaciones.content);
        this.eventos.set(eventos.content);
        this.tipos.set(tipos.content);
        this.totalUbicaciones.set(ubicaciones.totalElements);
        this.totalEventos.set(eventos.totalElements);
        this.totalTipos.set(tipos.totalElements);
        this.cargando.set(false);
        this.cargarPersonal();
      },
      error: err => this.mostrarError(err)
    });
  }

  cargarPersonal():void {
    const id=this.organizadorId(); if(id===null)return;
    this.api.listarPersonal(id).subscribe({next:p=>this.personal.set(p),error:err=>this.mostrarError(err)});
  }
  seleccionarImagen(event:Event):void {
    const input=event.target as HTMLInputElement;
    this.imagenArchivo=input.files?.[0] ?? null;
    if(this.imagenArchivo && (this.imagenArchivo.size>5*1024*1024 || !['image/jpeg','image/png','image/webp'].includes(this.imagenArchivo.type))){
      this.imagenArchivo=null; input.value=''; this.error.set('Selecciona JPG, PNG o WebP de máximo 5 MB.');
    }
  }
  subirPortada(evento:Evento):void {
    if(!this.imagenArchivo)return;
    this.ejecutar(this.api.subirImagenEvento(evento.id,this.imagenArchivo),'Portada guardada.',()=>{this.imagenArchivo=null;this.cargarTodo();});
  }
  imagenEvento(url?:string|null):string {return this.api.urlImagen(url);}
  registrarPersonal():void {
    const id=this.organizadorId();if(id===null)return;
    this.ejecutar(this.api.crearPersonal(id,this.personalForm),'Invitación enviada al correo del empleado.',()=>{
      this.personalForm={nombre:'',apellidos:'',cedula:'',telefono:'',correo:''};this.cargarPersonal();
    });
  }
  asignarEmpleado():void {
    const id=this.organizadorId();if(id===null || !this.asignacionPersonalId || !this.asignacionEventoId)return;
    this.ejecutar(this.api.asignarPersonal(id,this.asignacionPersonalId,this.asignacionEventoId),'Empleado asignado.',()=>this.cargarPersonal());
  }

  // UBICACIONES
  abrirUbicacion(ubicacion?: Ubicacion): void {
    this.editandoUbicacion.set(ubicacion?.id ?? null);
    this.ubicacionForm = ubicacion
      ? { nombre: ubicacion.nombre, direccion: ubicacion.direccion, ciudad: ubicacion.ciudad, capacidad: ubicacion.capacidad }
      : this.ubicacionVacia();
    this.mostrarUbicacion.set(true);
    this.limpiar();
  }

  guardarUbicacion(): void {
    if (this.procesando()) return;
    const datos: UbicacionRequest = {
      nombre: this.ubicacionForm.nombre.trim(),
      direccion: this.ubicacionForm.direccion.trim(),
      ciudad: this.ubicacionForm.ciudad.trim(),
      capacidad: Number(this.ubicacionForm.capacidad)
    };
    if (!datos.nombre || !datos.direccion || !datos.ciudad ||
        !Number.isInteger(datos.capacidad) || datos.capacidad < 1) {
      this.error.set('Completa correctamente los datos de la ubicación.');
      return;
    }
    const id = this.editandoUbicacion();
    this.ejecutar(
      id !== null ? this.api.editarUbicacion(id, datos) : this.api.crearUbicacion(datos),
      'Ubicación guardada.',
      () => { this.mostrarUbicacion.set(false); this.cargarTodo(); }
    );
  }

  desactivarUbicacion(ubicacion: Ubicacion): void {
    if (!confirm(`¿Desactivar la ubicación «${ubicacion.nombre}»?`)) return;
    this.ejecutar(this.api.desactivarUbicacion(ubicacion.id), 'Ubicación desactivada.', () => this.cargarTodo());
  }

  // EVENTOS
  abrirEvento(evento?: Evento): void {
    if (this.organizadorId() === null) {
      this.error.set('No se ha podido identificar tu organización.');
      return;
    }
    this.editandoEvento.set(evento?.id ?? null);
    this.eventoForm = evento ? {
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      fechaInicio: evento.fechaInicio.slice(0, 16),
      fechaFin: evento.fechaFin.slice(0, 16),
      aforoMaximo: evento.aforoMaximo,
      organizadorId: evento.organizadorId,
      ubicacionId: evento.ubicacionId
    } : this.eventoVacio();
    this.mostrarEvento.set(true);
    this.limpiar();
  }

  guardarEvento(): void {
    if (this.procesando()) return;

    const datos: EventoRequest = {
      ...this.eventoForm,
      titulo: this.eventoForm.titulo.trim(),
      descripcion: this.eventoForm.descripcion.trim(),
      aforoMaximo: Number(this.eventoForm.aforoMaximo),
      organizadorId: Number(this.organizadorId()),
      ubicacionId: Number(this.eventoForm.ubicacionId),
      fechaInicio: this.normalizarFecha(this.eventoForm.fechaInicio),
      fechaFin: this.normalizarFecha(this.eventoForm.fechaFin)
    };

    console.log('DATOS DEL EVENTO:', datos);

    const lugar = this.misUbicaciones().find(
      u => u.id === datos.ubicacionId && u.activa
    );

    if (datos.titulo.length < 5) {
      this.error.set('El título debe tener al menos 5 caracteres.');
      return;
    }
    if (datos.descripcion.length < 10) {
      this.error.set('La descripción debe tener al menos 10 caracteres.');
      return;
    }
    if (!lugar) {
      this.error.set('Selecciona una ubicación activa.');
      return;
    }
    if (!Number.isInteger(datos.aforoMaximo) || datos.aforoMaximo < 1 || datos.aforoMaximo > lugar.capacidad) {
      this.error.set(`El aforo debe estar entre 1 y ${lugar.capacidad} personas.`);
      return;
    }
    if (!datos.fechaInicio || !datos.fechaFin) {
      this.error.set('Selecciona las fechas de inicio y fin.');
      return;
    }
    const inicio = new Date(datos.fechaInicio);
    const fin = new Date(datos.fechaFin);
    if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime())) {
      this.error.set('Las fechas ingresadas no son válidas.');
      return;
    }
    if (inicio <= new Date()) {
      this.error.set('La fecha de inicio debe ser futura.');
      return;
    }
    if (fin <= inicio) {
      this.error.set('La fecha de fin debe ser posterior al inicio.');
      return;
    }

    console.log('VALIDACIONES CORRECTAS. ENVIANDO AL BACKEND...');
    const id = this.editandoEvento();
    this.ejecutar(
      id !== null ? this.api.editarEvento(id, datos) : this.api.crearEvento(datos),
      'Evento guardado.',
      () => { this.mostrarEvento.set(false); this.cargarTodo(); }
    );
  }

  private normalizarFecha(fecha: string): string {
    return fecha.length === 16 ? `${fecha}:00` : fecha;
  }

  cambiarEstado(evento: Evento, estado: EstadoEditable): void {
    if (!confirm(`¿Cambiar «${evento.titulo}» a ${estado}?`)) return;
    this.ejecutar(this.api.cambiarEstado(evento.id, estado), `Evento actualizado a ${estado}.`, () => this.cargarTodo());
  }

  verEvento(evento: Evento): void {
    this.eventoSeleccionadoId.set(evento.id);
    this.mostrarEvento.set(false);
    this.limpiar();
  }

  cerrarDetalle(): void {
    this.eventoSeleccionadoId.set(null);
  }

  ubicacionNombre(id: number): string {
    return this.ubicaciones().find(u => u.id === id)?.nombre ?? `Ubicación #${id}`;
  }

  tiposDelEvento(eventoId: number): TipoEntrada[] {
    return this.misTipos().filter(t => t.eventoId === eventoId);
  }

  entradasConfiguradas(eventoId: number): number {
    return this.tiposDelEvento(eventoId).reduce((n, t) => n + t.cantidadTotal, 0);
  }

  entradasDisponibles(eventoId: number): number {
    return this.tiposDelEvento(eventoId).reduce((n, t) => n + t.cantidadDisponible, 0);
  }

  porcentajeAforo(evento: Evento): number {
    if (evento.aforoMaximo <= 0) return 0;
    return Math.min(100, Math.round(this.entradasConfiguradas(evento.id) / evento.aforoMaximo * 100));
  }

  // TIPOS DE ENTRADA
  abrirTipo(evento?: Evento): void {
    this.cambiarSeccion('entradas');
    this.tipoForm = this.tipoVacio(evento?.id ?? 0);
    this.mostrarTipo.set(true);
  }

  guardarTipo(): void {
    if (this.procesando()) return;
    const datos: TipoEntradaRequest = {
      eventoId: Number(this.tipoForm.eventoId),
      nombre: this.tipoForm.nombre.trim(),
      precio: Number(this.tipoForm.precio),
      cantidadTotal: Number(this.tipoForm.cantidadTotal)
    };
    const evento = this.misEventos().find(e => e.id === datos.eventoId && e.estado === 'BORRADOR');
    if (!evento || datos.nombre.length < 2 || !Number.isFinite(datos.precio) ||
        datos.precio < 0 || !Number.isInteger(datos.cantidadTotal) || datos.cantidadTotal < 1 ||
        this.entradasConfiguradas(datos.eventoId) + datos.cantidadTotal > evento.aforoMaximo) {
      this.error.set('Selecciona un evento en borrador y verifica nombre, precio, cantidad y aforo disponible.');
      return;
    }
    this.ejecutar(this.api.crearTipo(datos), 'Tipo de entrada creado.', () => {
      this.mostrarTipo.set(false);
      this.cargarTodo();
    });
  }

  nombreEvento(eventoId: number): string {
    return this.misEventos().find(e => e.id === eventoId)?.titulo ?? `Evento #${eventoId}`;
  }

  // UTILIDADES
  private ejecutar<T>(peticion: Observable<T>, exito: string, despues: () => void): void {
    if (this.procesando()) return;
    this.procesando.set(true);
    this.limpiar();
    peticion.subscribe({
      next: () => {
        this.procesando.set(false);
        despues();
        this.mensaje.set(exito);
      },
      error: err => this.mostrarError(err)
    });
  }

  private limpiar(): void {
    this.error.set('');
    this.mensaje.set('');
  }

  private mostrarError(err: HttpErrorResponse): void {
    this.procesando.set(false);
    this.cargando.set(false);
    const mensaje = typeof err.error === 'string'
      ? err.error
      : (err.error?.message || err.error?.mensaje);
    this.error.set(mensaje || `No se pudo completar la operación (HTTP ${err.status}).`);
  }

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    this.router.navigateByUrl('/login');
  }
}
