import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Pagina<T> {
  content: T[]; totalElements: number; totalPages: number;
  number: number; size: number; first: boolean; last: boolean;
}
export interface UsuarioAdmin {
  id: number; nombre: string; apellidos: string | null; cedula: string | null;
  telefono: string | null; correo: string; rol: string;
  activo: boolean; correoVerificado: boolean;
  motivoBloqueo: string | null; fechaBloqueo: string | null;
}
export interface SolicitudOrganizador {
  id: number; usuarioId: number | null; nombre: string; correo: string;
  telefono: string; ruc: string | null; estado: string;
  activo: boolean; motivoRechazo: string | null;
}
export interface UbicacionAdmin {
  id: number; nombre: string; direccion: string; ciudad: string;
  capacidad: number; activa: boolean; organizadorId?: number | null;
}
export interface UbicacionRequest { nombre: string; direccion: string; ciudad: string; capacidad: number; }
export interface EventoAdmin {
  id: number; titulo: string; descripcion: string; fechaInicio: string;
  fechaFin: string; aforoMaximo: number; estado: string;
  organizadorId: number; ubicacionId: number; imagenUrl: string | null;
}
export interface ApelacionAdmin {
  id: number; usuarioId: number; correo: string; motivo: string;
  estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  fechaSolicitud: string; fechaResolucion: string | null; respuestaAdmin: string | null;
}
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly api = 'https://eventix-backend-production-4e1dd560.up.railway.app/api';
  listarUsuarios(page = 0, size = 10): Observable<Pagina<UsuarioAdmin>> {
    return this.http.get<Pagina<UsuarioAdmin>>(`${this.api}/usuarios`, { params: { page, size } });
  }
  listarPendientes(page = 0, size = 10): Observable<Pagina<SolicitudOrganizador>> {
    return this.http.get<Pagina<SolicitudOrganizador>>(`${this.api}/solicitudes-organizador/pendientes`, { params: { page, size } });
  }
  aprobarOrganizador(id: number): Observable<SolicitudOrganizador> {
    return this.http.patch<SolicitudOrganizador>(`${this.api}/solicitudes-organizador/${id}/aprobar`, {});
  }
  rechazarOrganizador(id: number, motivo: string): Observable<SolicitudOrganizador> {
    return this.http.patch<SolicitudOrganizador>(`${this.api}/solicitudes-organizador/${id}/rechazar`, { motivo });
  }
  listarUbicaciones(page = 0, size = 10): Observable<Pagina<UbicacionAdmin>> {
    return this.http.get<Pagina<UbicacionAdmin>>(`${this.api}/ubicaciones`, { params: { page, size } });
  }
  crearUbicacion(datos: UbicacionRequest): Observable<UbicacionAdmin> {
    return this.http.post<UbicacionAdmin>(`${this.api}/ubicaciones`, datos);
  }
  listarEventos(page = 0, size = 10): Observable<Pagina<EventoAdmin>> {
    return this.http.get<Pagina<EventoAdmin>>(`${this.api}/eventos`, { params: { page, size } });
  }
  bloquearUsuario(id: number, motivo: string): Observable<UsuarioAdmin> {
    return this.http.patch<UsuarioAdmin>(`${this.api}/usuarios/${id}/bloquear`, { motivo });
  }
  desbloquearUsuario(id: number): Observable<UsuarioAdmin> {
    return this.http.patch<UsuarioAdmin>(`${this.api}/usuarios/${id}/desbloquear`, {});
  }
  listarApelaciones(page = 0, size = 10): Observable<Pagina<ApelacionAdmin>> {
    return this.http.get<Pagina<ApelacionAdmin>>(`${this.api}/apelaciones/pendientes`, { params: { page, size } });
  }
  resolverApelacion(id: number, aprobar: boolean, respuesta: string): Observable<ApelacionAdmin> {
    const accion = aprobar ? 'aprobar' : 'rechazar';
    return this.http.patch<ApelacionAdmin>(`${this.api}/apelaciones/${id}/${accion}`, { respuesta });
  }
}
