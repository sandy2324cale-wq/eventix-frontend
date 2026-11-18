
import {
  Component,
  inject,
  signal,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';

import { AuthService } from '../../core/services/auth';

// Asignaciones del personal de control de acceso
interface Asignacion {
  id: number;
  personalId: number;
  eventoId: number;
  activo: boolean;
}

@Component({
  selector: 'app-control-acceso',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './control-acceso.html',
  styleUrl: './control-acceso.scss'
})
export class ControlAcceso implements OnInit, OnDestroy {

  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private router = inject(Router);

  private apiUrl = 'https://eventix-backend-production-4e1dd560.up.railway.app/api';

  // Referencia al video donde aparece la cámara
  @ViewChild('videoScanner')
  videoScanner?: ElementRef<HTMLVideoElement>;

  // Lector de códigos QR
  private lector = new BrowserQRCodeReader();

  // Controles de la cámara
  private controles?: IScannerControls;

  // Evita procesar varias veces el mismo QR
  private ultimoCodigo = '';
  private ultimaLectura = 0;

  // Estado de la aplicación
  asignaciones = signal<Asignacion[]>([]);
  codigo = '';

  mensaje = signal('');
  resultado = signal<'ok' | 'error' | ''>('');
  procesando = signal(false);
  cargando = signal(true);

  camaraActiva = signal(false);
  iniciandoCamara = signal(false);
  errorCamara = signal('');

  // Información de la última validación
  ultimoIngreso = signal<string | null>(null);

  // Contador local de ingresos validados
  ingresosValidados = signal(0);

  ngOnInit(): void {
    this.cargarAsignaciones();
  }

  ngOnDestroy(): void {
    this.detenerCamara();
  }

  // ==========================================
  // CARGAR EVENTOS ASIGNADOS
  // ==========================================

  cargarAsignaciones(): void {

    this.cargando.set(true);

    this.http.get<Asignacion[]>(
      `${this.apiUrl}/personal-control/mis-eventos`
    ).subscribe({

      next: (asignaciones) => {
        this.asignaciones.set(asignaciones);
        this.cargando.set(false);
      },

      error: () => {
        this.mensaje.set(
          'No se pudieron cargar los eventos asignados.'
        );

        this.resultado.set('error');
        this.cargando.set(false);
      }
    });
  }

  // ==========================================
  // ACTIVAR CÁMARA
  // ==========================================

  async activarCamara(): Promise<void> {

    if (this.camaraActiva() || this.iniciandoCamara()) {
      return;
    }

    this.errorCamara.set('');
    this.iniciandoCamara.set(true);

    // Primero mostrar el elemento de video
    this.camaraActiva.set(true);

    // Esperar a que Angular cree el video
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });

    const video = this.videoScanner?.nativeElement;

    if (!video) {
      this.errorCamara.set(
        'No se pudo iniciar la vista de la cámara.'
      );

      this.camaraActiva.set(false);
      this.iniciandoCamara.set(false);
      return;
    }

    try {

      this.controles = await this.lector.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: 'environment' }
          }
        },
        video,
        (resultado, error) => {

          if (!resultado) {
            return;
          }

          const codigo = resultado.getText().trim();

          // Evitar múltiples validaciones simultáneas
          if (this.procesando()) {
            return;
          }

          const ahora = Date.now();

          if (
            codigo === this.ultimoCodigo &&
            ahora - this.ultimaLectura < 3000
          ) {
            return;
          }

          this.ultimoCodigo = codigo;
          this.ultimaLectura = ahora;

          this.codigo = codigo;

          // Detener lectura antes de validar
          this.detenerCamara();

          this.validar();
        }
      );

    } catch (error) {

      this.camaraActiva.set(false);

      this.errorCamara.set(
        'No se pudo acceder a la cámara. Revisa los permisos del navegador.'
      );
    } finally {
      this.iniciandoCamara.set(false);
    }
  }

  // ==========================================
  // DETENER CÁMARA
  // ==========================================

  detenerCamara(): void {

    this.controles?.stop();
    this.controles = undefined;

    this.camaraActiva.set(false);
  }

  // ==========================================
  // VALIDAR ENTRADA
  // ==========================================

  validar(): void {

    if (this.procesando()) {
      return;
    }

    const codigo = this.codigo.trim();

    // Validación del formato UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(codigo)) {

      this.resultado.set('error');
      this.mensaje.set(
        'El código QR no contiene un UUID válido.'
      );

      return;
    }

    this.procesando.set(true);
    this.resultado.set('');
    this.mensaje.set('');

    this.http.post(
      `${this.apiUrl}/acceso/validar/${encodeURIComponent(codigo)}`,
      {}
    ).subscribe({

      next: () => {

        this.resultado.set('ok');

        this.mensaje.set(
          'Acceso autorizado. La entrada fue marcada como utilizada.'
        );

        this.ultimoIngreso.set(
          new Date().toLocaleString('es-EC')
        );

        this.ingresosValidados.update(valor => valor + 1);

        this.codigo = '';
        this.procesando.set(false);
      },

      error: (error) => {

        this.resultado.set('error');

        this.mensaje.set(
          error.error?.message ||
          'Acceso rechazado. Verifica que la entrada sea válida.'
        );

        this.procesando.set(false);
      }
    });
  }

  // ==========================================
  // CERRAR SESIÓN
  // ==========================================

  salir(): void {

    this.detenerCamara();

    this.auth.cerrarSesion();

    this.router.navigateByUrl('/login', {
      replaceUrl: true
    });
  }
}
