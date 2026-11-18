
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { DescripcionVoz } from '../../shared/directives/descripcion-voz';

import {
  AuthService,
  AuthResponse,
  RolUsuario
} from '../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DescripcionVoz
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {

  private auth = inject(AuthService);
  private router = inject(Router);

  // ==========================================
  // DATOS DEL FORMULARIO
  // ==========================================

  correo = '';
  contrasena = '';

  // ==========================================
  // ESTADOS
  // ==========================================

  mostrarContrasena = signal(false);
  cargando = signal(false);

  error = signal('');
  mostrarAviso = signal(false);

  necesitaVerificacion = signal(false);
  cuentaBloqueada = signal(false);

  // ==========================================
  // MOSTRAR / OCULTAR CONTRASEÑA
  // ==========================================

  alternarContrasena(): void {
    this.mostrarContrasena.update(valor => !valor);
  }

  // ==========================================
  // INICIAR SESIÓN
  // ==========================================

  iniciarSesion(): void {

    if (this.cargando()) return;

    this.error.set('');
    this.mostrarAviso.set(false);
    this.necesitaVerificacion.set(false);
    this.cuentaBloqueada.set(false);

    this.correo = this.correo.trim().toLowerCase();

    if (!this.correo || !this.contrasena) {
      this.error.set('Completa todos los campos.');
      return;
    }

    // Validación correcta del correo electrónico
    const expresionCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!expresionCorreo.test(this.correo)) {
      this.error.set(
        'Ingresa un correo electrónico válido.'
      );
      return;
    }

    this.cargando.set(true);

    this.auth.login({
      correo: this.correo,
      password: this.contrasena
    }).subscribe({

      next: (respuesta: AuthResponse) => {

        this.cargando.set(false);

        if (!respuesta.accessToken || !respuesta.rol) {
          this.error.set(
            'El servidor devolvió una respuesta de autenticación incompleta.'
          );
          return;
        }

        const destino = this.obtenerRutaPorRol(
          respuesta.rol
        );

        if (!destino) {
          this.error.set(
            'Tu cuenta tiene un rol que no está configurado en Eventix.'
          );
          return;
        }

        this.auth.guardarSesion(respuesta);

        this.contrasena = '';

        this.router.navigateByUrl(destino);
      },

      error: (err: HttpErrorResponse) => {

        this.cargando.set(false);

        this.procesarError(err);
      }
    });
  }

  // ==========================================
  // REDIRECCIÓN SEGÚN EL ROL
  // ==========================================

  private obtenerRutaPorRol(
    rol: RolUsuario
  ): string | null {

    switch (rol) {

      case 'CLIENTE':
        return '/cliente';

      case 'ORGANIZADOR':
        return '/organizador';

      case 'ADMIN':
        return '/admin';

      case 'CONTROL_ACCESO':
        return '/control-acceso';

      default:
        return null;
    }
  }

  // ==========================================
  // PROCESAR ERRORES DEL BACKEND
  // ==========================================

  private procesarError(
    err: HttpErrorResponse
  ): void {

    if (err.status === 0) {

      this.error.set(
        'No se pudo conectar con el servidor. Comprueba que Spring Boot esté iniciado.'
      );

      return;
    }

    let respuesta = err.error;

    if (typeof respuesta === 'string') {
      try {
        respuesta = JSON.parse(respuesta);
      } catch {
        respuesta = {
          message: respuesta
        };
      }
    }

    const mensaje =
      typeof respuesta?.message === 'string'
        ? respuesta.message
        : typeof respuesta?.mensaje === 'string'
          ? respuesta.mensaje
          : '';

    const codigo =
      typeof respuesta?.codigo === 'string'
        ? respuesta.codigo
        : typeof respuesta?.code === 'string'
          ? respuesta.code
          : '';

    // ========================================
    // CUENTA BLOQUEADA
    // ========================================

    if (
      /bloquead|suspendid|inhabilitad/i.test(
        `${mensaje} ${codigo}`
      )
    ) {

      this.cuentaBloqueada.set(true);

      this.error.set(
        mensaje ||
        'Tu cuenta se encuentra bloqueada. Puedes presentar una apelación para solicitar una revisión.'
      );

      return;
    }

    // ========================================
    // CORREO SIN VERIFICAR
    // ========================================

    if (
      /verific|activaci[oó]n|correo.*pendiente/i.test(
        mensaje
      )
    ) {

      this.necesitaVerificacion.set(true);

      this.error.set(
        'Tu correo todavía no está verificado. Activa tu cuenta para continuar.'
      );

      return;
    }

    // ========================================
    // CREDENCIALES INCORRECTAS
    // ========================================

    if (err.status === 401) {

      this.error.set(
        'Correo o contraseña incorrectos.'
      );

      return;
    }

    // ========================================
    // OTROS ERRORES
    // ========================================

    this.error.set(
      mensaje ||
      'No se pudo iniciar sesión. Inténtalo nuevamente.'
    );
  }

  // ==========================================
  // REGISTRO
  // ==========================================

  irRegistro(): void {
    this.router.navigate(['/registro']);
  }

  // ==========================================
  // LIMPIAR MENSAJES
  // ==========================================

  limpiarMensajes(): void {

    this.error.set('');
    this.mostrarAviso.set(false);

    this.necesitaVerificacion.set(false);
    this.cuentaBloqueada.set(false);
  }
}
