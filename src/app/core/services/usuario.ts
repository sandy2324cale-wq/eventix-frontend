
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PerfilUsuario {
  id: number;
  nombre: string;
  apellidos: string;
  cedula: string;
  telefono: string;
  correo: string;
  rol: string;
  activo: boolean;
  correoVerificado: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private http = inject(HttpClient);

  private apiUrl = 'https://eventix-backend-production-4e1dd560.up.railway.app/api/usuarios';

  obtenerMiPerfil(): Observable<PerfilUsuario> {
    return this.http.get<PerfilUsuario>(
      `${this.apiUrl}/yo`
    );
  }
}
