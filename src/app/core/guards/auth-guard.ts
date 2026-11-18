
import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  AuthService,
  RolUsuario
} from '../services/auth';

export const authGuard = (
  rolesPermitidos: RolUsuario[]
): CanActivateFn => {

  return () => {

    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.estaAutenticado()) {
      return router.createUrlTree(['/login']);
    }

    const rol = auth.obtenerRol();

    if (!rol || !rolesPermitidos.includes(rol)) {
      return router.createUrlTree(['/']);
    }

    return true;
  };
};
