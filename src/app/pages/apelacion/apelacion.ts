import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-apelacion', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './apelacion.html', styleUrl: './apelacion.scss'
})
export class Apelacion {
  private http = inject(HttpClient);
  private api = 'https://eventix-backend-production-4e1dd560.up.railway.app/api/apelaciones';
  correo = ''; codigo = ''; motivo = '';
  paso = signal<1 | 2>(1);
  cargando = signal(false);
  error = signal(''); mensaje = signal(''); enviada = signal(false);

  solicitarCodigo(): void {
    if (this.cargando()) return;
    this.correo = this.correo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo)) {
      this.error.set('Ingresa un correo válido.'); return;
    }
    this.error.set(''); this.mensaje.set(''); this.cargando.set(true);
    this.http.post(`${this.api}/solicitar-codigo`, { correo: this.correo }).subscribe({
      next: () => {
        this.cargando.set(false); this.paso.set(2);
        this.mensaje.set('Si tu cuenta cumple las condiciones, recibirás un código por correo.');
      }, error: (err: HttpErrorResponse) => this.mostrarError(err)
    });
  }

  enviarApelacion(): void {
    if (this.cargando()) return;
    if (!/^\d{6}$/.test(this.codigo.trim())) { this.error.set('Ingresa el código de 6 dígitos.'); return; }
    if (this.motivo.trim().length < 10 || this.motivo.trim().length > 1000) {
      this.error.set('La explicación debe tener entre 10 y 1000 caracteres.'); return;
    }
    this.error.set(''); this.cargando.set(true);
    this.http.post(`${this.api}/confirmar`, {
      correo: this.correo, codigo: this.codigo.trim(), motivo: this.motivo.trim()
    }).subscribe({
      next: () => { this.cargando.set(false); this.enviada.set(true); this.mensaje.set('Tu apelación fue enviada al administrador.'); },
      error: (err: HttpErrorResponse) => this.mostrarError(err)
    });
  }

  private mostrarError(err: HttpErrorResponse): void {
    this.cargando.set(false);
    this.error.set(err.status === 0 ? 'No se pudo conectar con Spring Boot.' :
      (typeof err.error?.message === 'string' ? err.error.message : 'No se pudo completar la solicitud.'));
  }
}
