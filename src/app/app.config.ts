import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { PreloadAllModules, provideRouter, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { dashboardAuthInterceptor } from './core/auth/dashboard-auth.interceptor';
import OneHealthPreset from './theme/one-health.preset';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([dashboardAuthInterceptor])),
    providePrimeNG({
      ripple: false,
      theme: {
        preset: OneHealthPreset,
        options: {
          darkModeSelector: false,
          cssLayer: false,
        },
      },
    }),
  ],
};
