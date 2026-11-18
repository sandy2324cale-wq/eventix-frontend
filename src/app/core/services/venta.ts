
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

// =====================================
// RESERVAS
// =====================================

export interface ReservaVista {
  id: number;
  tipoEntradaId: number;
  cantidad: number;
  estado: string;
  fechaExpiracion: string;

  eventoNombre: string;
  eventoId: number;
  tipoEntradaNombre: string;
  fechaEvento: string;
  imagenUrl: string | null;
  precioUnitario: number;
  total: number;
}

// =====================================
// ENTRADAS DIGITALES
// =====================================

export interface EntradaVista {
  id: number;
  qr: string;
  estado: string;
  eventoId: number;
  fechaValidacion: string | null;

  eventoNombre: string;
  fechaEvento: string;
  imagenUrl: string | null;
  tipoEntrada: string;
}

// =====================================
// COMPRAS
// =====================================

export interface CompraVista {
  id: number;
  reservaId: number;
  total: number;
  estado: string;
  codigosQr: string[];
}

export interface CompraResumen {
  id: number;
  reservaId: number;
  evento: string;
  tipoEntrada: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  estado: string;
  fechaCompra: string;
}

// =====================================
// SERVICIO DE VENTAS
// =====================================

@Injectable({
  providedIn: 'root'
})
export class VentaService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'https://eventix-backend-production-4e1dd560.up.railway.app/api';

  // =====================================
  // NORMALIZAR IMÁGENES
  // =====================================

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

  // =====================================
  // RESERVAS
  // =====================================

  misReservas(): Observable<ReservaVista[]> {

    return this.http.get<ReservaVista[]>(
      `${this.apiUrl}/reservas/mias`
    ).pipe(
      map(reservas =>
        reservas.map(reserva => ({
          ...reserva,
          imagenUrl: this.normalizarImagen(reserva.imagenUrl)
        }))
      )
    );
  }

  reservar(
    tipoEntradaId: number,
    cantidad: number
  ): Observable<ReservaVista> {

    return this.http.post<ReservaVista>(
      `${this.apiUrl}/reservas`,
      {
        tipoEntradaId,
        cantidad
      }
    );
  }

  cancelarReserva(
    id: number
  ): Observable<ReservaVista> {

    return this.http.post<ReservaVista>(
      `${this.apiUrl}/reservas/${id}/cancelar`,
      {}
    );
  }

  // =====================================
  // COMPRAS SIMULADAS
  // =====================================

  confirmarCompra(
    reservaId: number
  ): Observable<CompraVista> {

    return this.http.post<CompraVista>(
      `${this.apiUrl}/compras/confirmar/${reservaId}`,
      {}
    );
  }

  misCompras(): Observable<CompraResumen[]> {

    return this.http.get<CompraResumen[]>(
      `${this.apiUrl}/compras/mias`
    );
  }

  // =====================================
  // ENTRADAS Y CÓDIGOS QR
  // =====================================

  misEntradas(): Observable<EntradaVista[]> {

    return this.http.get<EntradaVista[]>(
      `${this.apiUrl}/entradas/mias`
    ).pipe(
      map(entradas =>
        entradas.map(entrada => ({
          ...entrada,
          imagenUrl: this.normalizarImagen(entrada.imagenUrl)
        }))
      )
    );
  }

  obtenerQr(
    entradaId: number
  ): Observable<Blob> {

    return this.http.get(
      `${this.apiUrl}/entradas/${entradaId}/qr.png`,
      {
        responseType: 'blob'
      }
    );
  }

  // =====================================
  // COMPROBANTES PDF
  // =====================================

  comprobantePdf(
    compraId: number
  ): Observable<Blob> {

    return this.http.get(
      `${this.apiUrl}/compras/${compraId}/comprobante.pdf`,
      {
        responseType: 'blob'
      }
    );
  }
}
