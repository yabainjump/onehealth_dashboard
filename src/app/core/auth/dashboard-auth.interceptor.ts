import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { DashboardSessionService } from './dashboard-session.service';

export const dashboardAuthInterceptor: HttpInterceptorFn = (request, next) => {
  const token = inject(DashboardSessionService).getToken();
  const isBackendRequest = request.url.startsWith(environment.apiBaseUrl);

  if (!token || !isBackendRequest || request.headers.has('Authorization')) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
