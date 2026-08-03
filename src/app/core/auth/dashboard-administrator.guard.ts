import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { DashboardAuthService } from './dashboard-auth.service';

export const dashboardAdministratorGuard: CanActivateFn = async () => {
  const auth = inject(DashboardAuthService);
  const router = inject(Router);
  const user = await auth.restoreSession();

  return auth.canManageHubUsers(user) ? true : router.createUrlTree(['/acces-refuse']);
};
