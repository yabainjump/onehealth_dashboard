import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideBell,
  LucideCircleHelp,
  LucideCircleUserRound,
  LucideDatabase,
  LucideFileText,
  LucideFlaskConical,
  LucideGrid3x3,
  LucideLayoutDashboard,
  LucideLogOut,
  LucideMap,
  LucideMenu,
  LucideSearch,
  LucideSettings,
  LucideShieldCheck,
  LucideSlidersHorizontal,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
import { OneHealthDataService } from '../../core/data/one-health-data.service';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideBell,
    LucideCircleHelp,
    LucideCircleUserRound,
    LucideDatabase,
    LucideFileText,
    LucideFlaskConical,
    LucideGrid3x3,
    LucideLayoutDashboard,
    LucideLogOut,
    LucideMap,
    LucideMenu,
    LucideSearch,
    LucideSettings,
    LucideShieldCheck,
    LucideSlidersHorizontal,
    LucideTriangleAlert,
    LucideX,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  protected readonly auth = inject(DashboardAuthService);
  protected readonly dataService = inject(OneHealthDataService);
  private readonly router = inject(Router);
  protected readonly menuOpen = signal(false);
  protected readonly profileMenuOpen = signal(false);

  protected toggleMenu(): void {
    this.menuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected toggleProfileMenu(): void {
    this.profileMenuOpen.update((open) => !open);
  }

  protected async logout(): Promise<void> {
    this.profileMenuOpen.set(false);
    await this.auth.logout();
    await this.router.navigateByUrl('/connexion');
  }
}
