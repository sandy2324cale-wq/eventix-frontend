
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// ==========================================
// PAGINACIÓN
// ==========================================

export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

// ==========================================
// MI ORGANIZACIÓN
// ==========================================

export interface MiOrganizacion {
  id: number;
  nombre: string;
  correo: string;
  telefono: string;
  descripcion: string;
  activo: boolean;
}

// ==========================================
// UBICACIONES
// ==========================================

export interface Ubicacion {
  id: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  capacidad: number;
  activa: boolean;
  organizadorId: number | null;
}

export interface UbicacionRequest {
  nombre: string;
  direccion: string;
  ciudad: string;
  capacidad: number;
}

// ==========================================
// EVENTOS
// ==========================================

export type EstadoEvento =
  | 'BORRADOR'
  | 'PUBLICADO'
  | 'CERRADO'
  | 'CANCELADO'
  | 'FINALIZADO';

export interface Evento {
  id: number;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  aforoMaximo: number;
  estado: EstadoEvento;
  organizadorId: number;
  ubicacionId: number;
  imagenUrl?: string | null;
}

export interface EventoRequest {
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  aforoMaximo: number;
  organizadorId: number;
  ubicacionId: number;
}

// ==========================================
// TIPOS DE ENTRADA
// ==========================================

export interface TipoEntrada {
  id: number;
  eventoId: number;
  nombre: string;
  precio: number;
  cantidadTotal: number;
  cantidadDisponible: number;
}

export interface TipoEntradaRequest {
  eventoId: number;
  nombre: string;
  precio: number;
  cantidadTotal: number;
}

// ==========================================
// SERVICIO ORGANIZADOR
// ==========================================

@Injectable({
  providedIn: 'root'
})
export class OrganizadorService {

  private readonly http = inject(HttpClient);

  private readonly base = 'https://eventix-backend-production-4e1dd560.up.railway.app/api';

  // ========================================
  // 1. MI ORGANIZACIÓN
  // ========================================

  obtenerMiOrganizacion(): Observable<MiOrganizacion> {

    return this.http.get<MiOrganizacion>(
      `${this.base}/organizadores/mi-organizacion`
    );
  }

  // ========================================
  // 2. UBICACIONES
  // ========================================

  listarUbicaciones(
    page = 0,
    size = 100
  ): Observable<Pagina<Ubicacion>> {

    return this.http.get<Pagina<Ubicacion>>(
      `${this.base}/ubicaciones`,
      {
        params: { page, size }
      }
    );
  }

  crearUbicacion(
    datos: UbicacionRequest
  ): Observable<Ubicacion> {

    return this.http.post<Ubicacion>(
      `${this.base}/ubicaciones`,
      datos
    );
  }

  editarUbicacion(
    id: number,
    datos: UbicacionRequest
  ): Observable<Ubicacion> {

    return this.http.put<Ubicacion>(
      `${this.base}/ubicaciones/${id}`,
      datos
    );
  }

  desactivarUbicacion(
    id: number
  ): Observable<void> {

    return this.http.delete<void>(
      `${this.base}/ubicaciones/${id}`
    );
  }

  // ========================================
  // 3. EVENTOS
  // ========================================

  listarEventos(
    page = 0,
    size = 100
  ): Observable<Pagina<Evento>> {

    return this.http.get<Pagina<Evento>>(
      `${this.base}/eventos`,
      {
        params: { page, size }
      }
    );
  }

  crearEvento(
    datos: EventoRequest
  ): Observable<Evento> {

    return this.http.post<Evento>(
      `${this.base}/eventos`,
      datos
    );
  }

  editarEvento(
    id: number,
    datos: EventoRequest
  ): Observable<Evento> {

    return this.http.put<Evento>(
      `${this.base}/eventos/${id}`,
      datos
    );
  }

  cambiarEstado(
    id: number,
    estado: 'PUBLICADO' | 'CERRADO' | 'CANCELADO'
  ): Observable<Evento> {

    const params = new HttpParams().set(
      'estado',
      estado
    );

    return this.http.patch<Evento>(
      `${this.base}/eventos/${id}/estado`,
      {},
      { params }
    );
  }

  subirImagenEvento(id:number, archivo:File): Observable<{mensaje:string;imagenUrl:string}> {
    const form = new FormData(); form.append('archivo', archivo);
    return this.http.post<{mensaje:string;imagenUrl:string}>(`${this.base}/eventos/${id}/imagen`, form);
  }
  urlImagen(url?:string|null): string {
    if (!url) return '';
    return url.startsWith('/') ? `https://eventix-backend-production-4e1dd560.up.railway.app${url}` : url;
  }
  listarPersonal(organizadorId:number):Observable<PersonalVista[]> {
    return this.http.get<PersonalVista[]>(`${this.base}/personal-control/organizaciones/${organizadorId}`);
  }
  crearPersonal(organizadorId:number, datos:CrearPersonalRequest):Observable<PersonalVista> {
    return this.http.post<PersonalVista>(`${this.base}/personal-control/organizaciones/${organizadorId}`,datos);
  }
  asignarPersonal(organizadorId:number, personalId:number, eventoId:number):Observable<AsignacionVista> {
    return this.http.post<AsignacionVista>(`${this.base}/personal-control/organizaciones/${organizadorId}/asignaciones`,{personalId,eventoId});
  }
  revocarAsignacion(organizadorId:number, id:number):Observable<void> {
    return this.http.delete<void>(`${this.base}/personal-control/organizaciones/${organizadorId}/asignaciones/${id}`);
  }
  // ========================================
  // 4. TIPOS DE ENTRADA
  // ========================================

  listarTipos(
    page = 0,
    size = 100
  ): Observable<Pagina<TipoEntrada>> {

    return this.http.get<Pagina<TipoEntrada>>(
      `${this.base}/tipos-entrada`,
      {
        params: { page, size }
      }
    );
  }

  crearTipo(
    datos: TipoEntradaRequest
  ): Observable<TipoEntrada> {

    return this.http.post<TipoEntrada>(
      `${this.base}/tipos-entrada`,
      datos
    );
  }
}


export interface PersonalVista { id:number; organizadorId:number; nombre:string; correo:string; activo:boolean; }
export interface AsignacionVista { id:number; personalId:number; eventoId:number; activo:boolean; }
export interface CrearPersonalRequest { nombre:string; apellidos:string; cedula:string; telefono:string; correo:string; }
