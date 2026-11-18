import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { VentaService } from '../../core/services/venta';
import { CatalogoPublicoService, EventoPublico, TipoEntradaPublico } from '../../core/services/catalogo-publico';

@Component({
  selector: 'app-eventos', standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './eventos.html', styleUrl: './eventos.scss'
})
export class Eventos implements OnInit {
  private catalogo = inject(CatalogoPublicoService);
  private ventas = inject(VentaService);
  private auth = inject(AuthService);
  private router = inject(Router);
  busqueda = signal('');
  pagina = signal(0);
  paginas = signal(0);
  eventos = signal<EventoPublico[]>([]);
  tipos = signal<TipoEntradaPublico[]>([]);
  seleccionado = signal<EventoPublico | null>(null);
  tipoId = signal<number | null>(null);
  cantidad = signal(1);
  cargando = signal(false);
  procesando = signal(false);
  error = signal('');
  aviso = signal('');
  tiposDelEvento = computed(() => this.tipos().filter(t => t.eventoId === this.seleccionado()?.id));
  tipoElegido = computed(() => this.tiposDelEvento().find(t => t.id === this.tipoId()) ?? null);
  total = computed(() => (this.tipoElegido()?.precio ?? 0) * this.cantidad());
  ngOnInit() { this.cargar(); }
  buscar(texto: string) { this.busqueda.set(texto); this.pagina.set(0); this.cargar(); }
  cambiarPagina(delta: number) { const p = this.pagina() + delta; if (p >= 0 && p < this.paginas()) { this.pagina.set(p); this.cargar(); } }
  cargar() {
    this.cargando.set(true); this.error.set('');
    forkJoin({ eventos: this.catalogo.eventos(this.busqueda(), this.pagina()), tipos: this.catalogo.tipos(0) }).subscribe({
      next: ({ eventos, tipos }) => {
        this.eventos.set(eventos.content); this.paginas.set(eventos.totalPages);
        this.tipos.set(tipos.content); this.cargando.set(false);
      }, error: e => { this.error.set(e?.error?.message || 'No se pudo consultar el catálogo.'); this.cargando.set(false); }
    });
  }
  abrir(evento: EventoPublico) {
    this.seleccionado.set(evento); this.tipoId.set(null); this.cantidad.set(1); this.error.set(''); this.aviso.set('');
  }
  cerrar() { this.seleccionado.set(null); }
  elegirTipo(id: number) { this.tipoId.set(id); this.cantidad.set(1); }
  cambiarCantidad(valor: string) { this.cantidad.set(Math.max(1, Math.min(10, Number(valor) || 1))); }
  reservar() {
    const tipo = this.tipoElegido();
    if (!tipo || this.procesando()) return;
    if (!this.auth.estaAutenticado()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/eventos' } }); return;
    }
    if (this.auth.obtenerRol() !== 'CLIENTE') { this.error.set('Debes ingresar con una cuenta de cliente para comprar entradas.'); return; }
    if (this.cantidad() > tipo.cantidadDisponible) { this.error.set('No hay suficientes entradas disponibles.'); return; }
    this.procesando.set(true); this.error.set('');
    this.ventas.reservar(tipo.id, this.cantidad()).subscribe({
      next: r => {
        this.procesando.set(false); this.cerrar();
        this.router.navigate(['/cliente'], { state: { reservaCreada: r.id } });
      }, error: e => { this.procesando.set(false); this.error.set(e?.error?.message || 'No se pudo reservar.'); }
    });
  }
}
