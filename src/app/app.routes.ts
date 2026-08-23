import { Routes } from '@angular/router';
import { dashboardAdministratorGuard } from './core/auth/dashboard-administrator.guard';
import { dashboardAuthGuard } from './core/auth/dashboard-auth.guard';
import { hubDataResolver } from './core/data/hub-data.resolver';

export const routes: Routes = [
  {
    path: 'connexion',
    title: 'Connexion | One Health Convergence Hub',
    loadComponent: () => import('./pages/auth/login.page').then((module) => module.LoginPage),
  },
  {
    path: 'acces-refuse',
    title: 'Accès non attribué | One Health Convergence Hub',
    loadComponent: () =>
      import('./pages/auth/access-denied.page').then((module) => module.AccessDeniedPage),
  },
  {
    path: '',
    canActivate: [dashboardAuthGuard],
    resolve: { hubData: hubDataResolver },
    loadComponent: () =>
      import('./layout/app-shell/app-shell.component').then((module) => module.AppShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Vue stratégique | One Health Network Dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.page').then((module) => module.DashboardPage),
      },
      {
        path: 'etat-membre',
        title: 'État membre | One Health Network Dashboard',
        loadComponent: () =>
          import('./pages/member-state/member-state.page').then(
            (module) => module.MemberStatePage,
          ),
      },
      {
        path: 'carte',
        title: 'Carte régionale | One Health Network Dashboard',
        loadComponent: () =>
          import('./pages/regional-map/regional-map.page').then((module) => module.RegionalMapPage),
      },
      {
        path: 'alertes/:id',
        title: 'Détail du signal | One Health Network Dashboard',
        loadComponent: () =>
          import('./pages/alerts/alert-detail.page').then((module) => module.AlertDetailPage),
      },
      {
        path: 'alertes',
        title: 'Alertes | One Health Network Dashboard',
        loadComponent: () =>
          import('./pages/alerts/alert-list.page').then((module) => module.AlertListPage),
      },
      {
        path: 'analyses',
        title: 'Analyses sectorielles | One Health Network Dashboard',
        loadComponent: () =>
          import('./pages/analyses/analyses.page').then((module) => module.AnalysesPage),
      },
      {
        path: 'rapports',
        title: 'Rapports | One Health Network Dashboard',
        loadComponent: () =>
          import('./pages/reports/reports.page').then((module) => module.ReportsPage),
      },
      {
        path: 'connecteurs',
        title: 'Connecteurs | One Health Network Dashboard',
        loadComponent: () =>
          import('./pages/connectors/connectors.page').then((module) => module.ConnectorsPage),
      },
      {
        path: 'souverainete',
        title: 'Registre de souveraineté | One Health Network Dashboard',
        loadComponent: () =>
          import('./pages/sovereignty/sovereignty.page').then(
            (module) => module.SovereigntyPage,
          ),
      },
      {
        path: 'administration',
        title: 'Administration Hub | One Health Network Dashboard',
        canActivate: [dashboardAdministratorGuard],
        loadComponent: () =>
          import('./pages/administration/administration.page').then(
            (module) => module.AdministrationPage,
          ),
      },
      {
        path: 'aide',
        title: 'Centre d’aide | One Health Network Dashboard',
        loadComponent: () =>
          import('./pages/help/help.page').then((module) => module.HelpPage),
      },
      {
        path: 'profil',
        title: 'Mon profil | One Health Network Dashboard',
        loadComponent: () =>
          import('./pages/profile/profile.page').then((module) => module.ProfilePage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
