import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DashboardAuthService } from './dashboard-auth.service';

export const dashboardHubAdministratorGuard: CanActivateFn = async () => {
  const auth = inject(DashboardAuthService);
  const router = inject(Router);
  const user = await auth.restoreSession();

  return auth.canManageConnectors(user) ? true : router.createUrlTree(['/acces-refuse']);
};
