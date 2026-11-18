
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface Pagina<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface EventoPublico {
  id: number;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  aforoMaximo: number;
  estado: string;
  organizadorId: number;
  ubicacionId: number;
  imagenUrl: string | null;
}

export interface TipoEntradaPublico {
  id: number;
  eventoId: number;
  nombre: string;
  precio: number;
  cantidadTotal: number;
  cantidadDisponible: number;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogoPublicoService {

  private readonly http = inject(HttpClient);

  private readonly api = 'https://eventix-backend-production-4e1dd560.up.railway.app/api';

  private normalizarImagen(
    imagenUrl: string | null | undefined
  ): string | null {

    if (!imagenUrl?.trim()) {
      return null;
    }

    const url = imagenUrl.trim();

    if (/^https?:\/\//i.test(url)) {
      return url;
    }

    return `https://eventix-backend-production-4e1dd560.up.railway.app/${url.replace(/^\/+/, '')}`;
  }

  eventos(
    titulo: string,
    page: number,
    size = 9
  ): Observable<Pagina<EventoPublico>> {

    let params = new HttpParams()
      .set('estado', 'PUBLICADO')
      .set('page', page)
      .set('size', size);

    if (titulo.trim()) {
      params = params.set('titulo', titulo.trim());
    }

    return this.http.get<Pagina<EventoPublico>>(
      `${this.api}/eventos`,
      { params }
    ).pipe(
      map(pagina => ({
        ...pagina,
        content: pagina.content.map(evento => ({
          ...evento,
          imagenUrl: this.normalizarImagen(evento.imagenUrl)
        }))
      }))
    );
  }

  tipos(
    page: number,
    size = 100
  ): Observable<Pagina<TipoEntradaPublico>> {

    return this.http.get<Pagina<TipoEntradaPublico>>(
      `${this.api}/tipos-entrada`,
      {
        params: {
          page,
          size
        }
      }
    );
  }
}
