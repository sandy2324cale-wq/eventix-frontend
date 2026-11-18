
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-activar-personal',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './activar-personal.html',
  styleUrl: './activar-personal.scss'
})
export class ActivarPersonal {

  private http = inject(HttpClient);

  private readonly API = 'https://eventix-backend-production-4e1dd560.up.railway.app/api/auth';

  correo = '';
  codigo = '';
  password = '';
  confirmarPassword = '';

  mensaje = signal('');
  mensajeReenvio = signal('');

  ocupado = signal(false);
  reenviando = signal(false);
  exito = signal(false);

  activar(): void {
    this.mensaje.set('');
    this.mensajeReenvio.set('');

    const correoUsuario = this.correo.trim();

    if (!correoUsuario) {
      this.mensaje.set('Introduce tu correo electrónico.');
      return;
    }

    if (!/^[0-9]{6}$/.test(this.codigo)) {
      this.mensaje.set('El código debe tener seis dígitos.');
      return;
    }

    if (this.password.length < 12 || this.password.length > 72) {
      this.mensaje.set(
        'La contraseña debe tener entre 12 y 72 caracteres.'
      );
      return;
    }

    if (this.password !== this.confirmarPassword) {
      this.mensaje.set('Las contraseñas no coinciden.');
      return;
    }

    this.ocupado.set(true);

    this.http.post<{ mensaje: string }>(
      `${this.API}/activar-personal`,
      {
        correo: correoUsuario,
        codigo: this.codigo,
        password: this.password,
        confirmarPassword: this.confirmarPassword
      }
    ).subscribe({
      next: respuesta => {
        this.mensaje.set(
          respuesta.mensaje || 'Cuenta activada correctamente.'
        );
        this.exito.set(true);
        this.ocupado.set(false);

        this.codigo = '';
        this.password = '';
        this.confirmarPassword = '';
      },
      error: error => {
        this.mensaje.set(
          error.error?.message ||
          error.error?.mensaje ||
          'No se pudo activar la cuenta. Revisa el código.'
        );
        this.ocupado.set(false);
      }
    });
  }

  reenviarCodigo(): void {
    const correoUsuario = this.correo.trim();

    this.mensajeReenvio.set('');

    if (!correoUsuario) {
      this.mensajeReenvio.set(
        'Primero introduce tu correo electrónico.'
      );
      return;
    }

    if (this.reenviando()) {
      return;
    }

    this.reenviando.set(true);

    this.http.post<{ mensaje: string }>(
      `${this.API}/reenviar-codigo`,
      { correo: correoUsuario }
    ).subscribe({
      next: respuesta => {
        this.mensajeReenvio.set(
          respuesta.mensaje ||
          'Si tu cuenta está pendiente, recibirás un nuevo código.'
        );
        this.reenviando.set(false);
      },
      error: () => {
        this.mensajeReenvio.set(
          'No se pudo procesar la solicitud. Inténtalo más tarde.'
        );
        this.reenviando.set(false);
      }
    });
  }
}
