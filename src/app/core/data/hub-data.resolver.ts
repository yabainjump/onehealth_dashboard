import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { OneHealthDataService } from './one-health-data.service';
import { DashboardAuthService } from '../auth/dashboard-auth.service';

export const hubDataResolver: ResolveFn<boolean> = async () => {
  const user = inject(DashboardAuthService).currentUser();
  const scopeKey = user
    ? [
        user.id,
        user.role,
        ...[...user.hubRoles].sort(),
        ...[...user.hubCountryCodes].sort(),
      ].join('|')
    : 'anonymous';
  await inject(OneHealthDataService).loadFromHub(scopeKey);
  return true;
};
