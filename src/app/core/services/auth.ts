import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type RolRegistro = 'CLIENTE' | 'ORGANIZADOR';
export type RolUsuario = 'CLIENTE' | 'ORGANIZADOR' | 'ADMIN' | 'CONTROL_ACCESO';

export interface RegistroRequest {
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  correo: string;
  password: string;
  confirmarPassword: string;
  rol: RolRegistro;
  nombreOrganizacion: string | null;
  descripcionOrganizacion: string | null;
  ruc: string | null;
}
export interface LoginRequest { correo: string; password: string; }
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  rol: RolUsuario;
  nombre: string;
}
export interface MensajeResponse { mensaje: string; }

const CLAVE_SESION = 'eventix_sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'https://eventix-backend-production-4e1dd560.up.railway.app/api/auth';
  private tokenActual = signal<string | null>(null);
  private usuarioActual = signal<AuthResponse | null>(null);
  readonly usuario = this.usuarioActual.asReadonly();

  constructor() {
    this.restaurarSesion();
  }

  registrar(datos: RegistroRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/registro`, datos, { responseType: 'text' });
  }
  verificarCorreo(correo: string, codigo: string): Observable<MensajeResponse> {
    return this.http.post<MensajeResponse>(`${this.apiUrl}/verificar`, { correo, codigo });
  }
  reenviarCodigo(correo: string): Observable<MensajeResponse> {
    return this.http.post<MensajeResponse>(`${this.apiUrl}/reenviar-codigo`, { correo });
  }
  login(datos: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, datos);
  }

  guardarSesion(respuesta: AuthResponse): void {
    if (!this.tokenVigente(respuesta.accessToken)) {
      this.cerrarSesion();
      throw new Error('El servidor devolvió un token inválido o expirado.');
    }
    this.tokenActual.set(respuesta.accessToken);
    this.usuarioActual.set(respuesta);
    try {
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify(respuesta));
    } catch {
      // En modo privado o con almacenamiento bloqueado, se conserva solo en memoria.
    }
  }

  obtenerToken(): string | null {
    const token = this.tokenActual();
    if (token && !this.tokenVigente(token)) {
      this.cerrarSesion();
      return null;
    }
    return token;
  }
  estaAutenticado(): boolean {
    return this.obtenerToken() !== null;
  }
  obtenerRol(): RolUsuario | null {
    return this.estaAutenticado() ? this.usuarioActual()?.rol ?? null : null;
  }
  cerrarSesion(): void {
    this.tokenActual.set(null);
    this.usuarioActual.set(null);
    try { sessionStorage.removeItem(CLAVE_SESION); } catch { /* sin acceso al almacenamiento */ }
  }

  private restaurarSesion(): void {
    try {
      const guardada = sessionStorage.getItem(CLAVE_SESION);
      if (!guardada) return;
      const respuesta: AuthResponse = JSON.parse(guardada);
      const roles: RolUsuario[] = ['CLIENTE', 'ORGANIZADOR', 'ADMIN', 'CONTROL_ACCESO'];
      if (!respuesta || !roles.includes(respuesta.rol) || !this.tokenVigente(respuesta.accessToken)) {
        this.cerrarSesion();
        return;
      }
      this.tokenActual.set(respuesta.accessToken);
      this.usuarioActual.set(respuesta);
    } catch {
      this.cerrarSesion();
    }
  }

  // Comprueba el exp del JWT localmente. El backend sigue siendo la autoridad real.
  private tokenVigente(token: unknown): boolean {
    if (typeof token !== 'string') return false;
    const partes = token.split('.');
    if (partes.length !== 3) return false;
    try {
      const payloadBase64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(payloadBase64));
      return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
