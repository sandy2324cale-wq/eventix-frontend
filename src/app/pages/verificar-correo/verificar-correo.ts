
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../core/services/auth';
import { DescripcionVoz } from '../../shared/directives/descripcion-voz';

@Component({
  selector: 'app-verificar-correo',
  standalone: true,
  imports: [FormsModule, RouterLink, DescripcionVoz],
  templateUrl: './verificar-correo.html',
  styleUrl: './verificar-correo.scss'
})
export class VerificarCorreo {

  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  correo = '';
  codigo = '';

  cargando = signal(false);
  reenviando = signal(false);
  error = signal('');
  aviso = signal('');
  verificado = signal(false);

  constructor() {
    this.correo =
      this.route.snapshot.queryParamMap.get('correo') ?? '';
  }

  verificar(): void {

    if (this.cargando() || this.verificado()) return;

    this.error.set('');
    this.aviso.set('');

    this.correo = this.correo.trim().toLowerCase();
    this.codigo = this.codigo.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo)) {
      this.error.set('Ingresa un correo electrónico válido.');
      return;
    }

    if (!/^[0-9]{6}$/.test(this.codigo)) {
      this.error.set('El código debe contener exactamente 6 números.');
      return;
    }

    this.cargando.set(true);

    this.auth.verificarCorreo(
      this.correo,
      this.codigo
    ).subscribe({

      next: (respuesta) => {
        this.cargando.set(false);
        this.verificado.set(true);
        this.aviso.set(respuesta.mensaje);
      },

      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(this.obtenerError(err));
      }
    });
  }

  reenviar(): void {

    if (this.reenviando() || this.verificado()) return;

    this.error.set('');
    this.aviso.set('');

    this.correo = this.correo.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo)) {
      this.error.set('Ingresa primero un correo válido.');
      return;
    }

    this.reenviando.set(true);

    this.auth.reenviarCodigo(this.correo).subscribe({

      next: (respuesta) => {
        this.reenviando.set(false);
        this.aviso.set(respuesta.mensaje);
      },

      error: (err: HttpErrorResponse) => {
        this.reenviando.set(false);
        this.error.set(this.obtenerError(err));
      }
    });
  }

  private obtenerError(err: HttpErrorResponse): string {

    if (err.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }

    let respuesta = err.error;

    if (typeof respuesta === 'string') {
      try {
        respuesta = JSON.parse(respuesta);
      } catch {
        return respuesta || 'Ocurrió un error inesperado.';
      }
    }

    if (respuesta?.fieldErrors) {
      const mensajes = Object.values(respuesta.fieldErrors);
      if (mensajes.length > 0) {
        return String(mensajes[0]);
      }
    }

    if (typeof respuesta?.message === 'string') {
      return respuesta.message;
    }

    if (typeof respuesta?.mensaje === 'string') {
      return respuesta.mensaje;
    }

    return 'No se pudo completar la solicitud. Inténtalo nuevamente.';
  }

  irAlLogin(): void {
    this.router.navigate(['/login']);
  }
}
