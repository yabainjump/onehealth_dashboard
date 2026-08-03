import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DashboardAuthService } from './dashboard-auth.service';

export const dashboardAuthGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(DashboardAuthService);
  const router = inject(Router);
  const user = await auth.restoreSession();

  if (!user) {
    return router.createUrlTree(['/connexion'], {
      queryParams: { retour: state.url },
    });
  }
  if (!auth.hasHubAccess(user)) {
    return router.createUrlTree(['/acces-refuse']);
  }
  return true;
};
