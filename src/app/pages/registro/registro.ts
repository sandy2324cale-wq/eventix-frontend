
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { DescripcionVoz } from '../../shared/directives/descripcion-voz';
import {
  AuthService,
  RegistroRequest,
  RolRegistro
} from '../../core/services/auth';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [FormsModule, RouterLink, DescripcionVoz],
  templateUrl: './registro.html',
  styleUrl: './registro.scss'
})
export class Registro {

  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  nombres = '';
  apellidos = '';
  cedula = '';
  telefono = '';
  correo = '';
  password = '';
  confirmarPassword = '';

  rol: RolRegistro = 'CLIENTE';

  nombreOrganizacion = '';
  descripcionOrganizacion = '';
  ruc = '';

  aceptarTerminos = false;

  mostrarContrasena = signal(false);
  cargando = signal(false);
  error = signal('');
  aviso = signal('');

  erroresCampos = signal<Record<string, string>>({});

  constructor() {
    const rolParametro =
      this.route.snapshot.queryParamMap.get('rol');

    if (rolParametro === 'ORGANIZADOR') {
      this.rol = 'ORGANIZADOR';
    }
  }

  seleccionarRol(rol: RolRegistro): void {
    this.rol = rol;
    this.erroresCampos.set({});
    this.error.set('');
  }

  errorCampo(campo: string): string {
    return this.erroresCampos()[campo] ?? '';
  }

  limpiarError(campo: string): void {
    this.erroresCampos.update(actual => {
      const copia = { ...actual };
      delete copia[campo];
      return copia;
    });
  }

  private agregarError(campo: string, mensaje: string): void {
    this.erroresCampos.update(actual => ({
      ...actual,
      [campo]: mensaje
    }));
  }

  private validarFormulario(): boolean {

    this.erroresCampos.set({});
    this.error.set('');

    this.nombres = this.nombres.trim();
    this.apellidos = this.apellidos.trim();
    this.cedula = this.cedula.trim();
    this.telefono = this.telefono.trim();
    this.correo = this.correo.trim().toLowerCase();

    if (this.nombres.length < 2 || this.nombres.length > 120) {
      this.agregarError(
        'nombres',
        'Ingresa tus nombres (entre 2 y 120 caracteres).'
      );
    }

    if (this.apellidos.length < 2 || this.apellidos.length > 80) {
      this.agregarError(
        'apellidos',
        'Ingresa tus apellidos (entre 2 y 80 caracteres).'
      );
    }

    if (!/^[0-9]{10}$/.test(this.cedula)) {
      this.agregarError(
        'cedula',
        'La cédula debe contener exactamente 10 números.'
      );
    }

    if (!/^09[0-9]{8}$/.test(this.telefono)) {
      this.agregarError(
        'telefono',
        'El celular debe tener 10 dígitos y comenzar con 09.'
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.correo)) {
      this.agregarError(
        'correo',
        'Ingresa un correo electrónico válido.'
      );
    }

    if (this.password.length < 12 || this.password.length > 72) {
      this.agregarError(
        'password',
        'La contraseña debe tener entre 12 y 72 caracteres.'
      );
    }

    if (!this.confirmarPassword) {
      this.agregarError(
        'confirmarPassword',
        'Confirma tu contraseña.'
      );
    } else if (this.password !== this.confirmarPassword) {
      this.agregarError(
        'confirmarPassword',
        'Las contraseñas no coinciden.'
      );
    }

    if (this.rol === 'ORGANIZADOR') {

      const nombre = this.nombreOrganizacion.trim();
      const descripcion = this.descripcionOrganizacion.trim();
      const ruc = this.ruc.trim();

      if (nombre && (nombre.length < 3 || nombre.length > 150)) {
        this.agregarError(
          'nombreOrganizacion',
          'El nombre debe tener entre 3 y 150 caracteres.'
        );
      }

      if (descripcion.length > 500) {
        this.agregarError(
          'descripcionOrganizacion',
          'La descripción no puede superar 500 caracteres.'
        );
      }

      if (ruc && !/^[0-9]{13}$/.test(ruc)) {
        this.agregarError(
          'ruc',
          'El RUC debe contener exactamente 13 números.'
        );
      }
    }

    if (!this.aceptarTerminos) {
      this.agregarError(
        'aceptarTerminos',
        'Debes aceptar los términos y condiciones.'
      );
    }

    if (Object.keys(this.erroresCampos()).length > 0) {
      this.error.set('Revisa los campos marcados para continuar.');
      this.enfocarPrimerError();
      return false;
    }

    return true;
  }

  private enfocarPrimerError(): void {
    const primerCampo = Object.keys(this.erroresCampos())[0];

    if (primerCampo) {
      setTimeout(() => {
        document.getElementById(primerCampo)?.focus();
      }, 0);
    }
  }

  registrar(): void {

    if (this.cargando()) return;

    this.aviso.set('');

    if (!this.validarFormulario()) return;

    const datos: RegistroRequest = {
      nombres: this.nombres,
      apellidos: this.apellidos,
      cedula: this.cedula,
      telefono: this.telefono,
      correo: this.correo,
      password: this.password,
      confirmarPassword: this.confirmarPassword,
      rol: this.rol,
      nombreOrganizacion:
        this.rol === 'ORGANIZADOR'
          ? this.nombreOrganizacion.trim() || null
          : null,
      descripcionOrganizacion:
        this.rol === 'ORGANIZADOR'
          ? this.descripcionOrganizacion.trim() || null
          : null,
      ruc:
        this.rol === 'ORGANIZADOR'
          ? this.ruc.trim() || null
          : null
    };

    this.cargando.set(true);

    this.auth.registrar(datos).subscribe({

      next: () => {
        this.cargando.set(false);

        this.router.navigate(['/verificar-correo'], {
          queryParams: {
            correo: this.correo
          }
        });
      },

      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.erroresCampos.set({});

        if (err.status === 0) {
          this.error.set(
            'No se pudo conectar con el servidor. Inténtalo nuevamente.'
          );
          return;
        }

        let respuesta = err.error;

        if (typeof respuesta === 'string') {
          try {
            respuesta = JSON.parse(respuesta);
          } catch {
            this.error.set(
              respuesta || 'No pudimos completar el registro.'
            );
            return;
          }
        }

        if (
          respuesta?.fieldErrors &&
          typeof respuesta.fieldErrors === 'object'
        ) {
          this.erroresCampos.set(respuesta.fieldErrors);
          this.error.set(
            'Revisa los campos marcados y corrige la información.'
          );
          this.enfocarPrimerError();
          return;
        }

        if (typeof respuesta?.message === 'string') {
          this.error.set(respuesta.message);
          return;
        }

        this.error.set(
          'No pudimos completar tu registro. Inténtalo nuevamente.'
        );
      }
    });
  }
}
