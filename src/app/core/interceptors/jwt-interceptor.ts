
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.obtenerToken();

  const esApiEventix = req.url.startsWith(
    'https://eventix-backend-production-4e1dd560.up.railway.app/api/'
  );

  const peticion = token && esApiEventix
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token && esApiEventix) {
        auth.cerrarSesion();
        router.navigate(['/login'], {
          queryParams: { sesionExpirada: true }
        });
      }

      return throwError(() => error);
    })
  );
};
