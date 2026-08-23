import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
  LucideLandmark,
  LucideLogOut,
  LucideMap,
  LucideMenu,
  LucideSearch,
  LucideSettings,
  LucideSend,
  LucideShieldCheck,
  LucideSparkles,
  LucideSlidersHorizontal,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
import { OneHealthDataService } from '../../core/data/one-health-data.service';
import { HubAiApiService } from '../../core/data/hub-ai-api.service';
import { RudolfMarkdownPipe } from '../../shared/pipes/rudolf-markdown.pipe';
import { revealRudolfText } from '../../shared/utils/reveal-rudolf-text';

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
    LucideLandmark,
    LucideLogOut,
    LucideMap,
    LucideMenu,
    LucideSearch,
    LucideSettings,
    LucideSend,
    LucideShieldCheck,
    LucideSparkles,
    RudolfMarkdownPipe,
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
  private readonly hubAi = inject(HubAiApiService);
  protected readonly menuOpen = signal(false);
  protected readonly profileMenuOpen = signal(false);
  protected readonly assistantOpen = signal(false);
  protected readonly assistantQuestion = signal('');
  protected readonly assistantAnswer = signal('');
  protected readonly assistantError = signal('');
  protected readonly assistantBusy = signal(false);
  protected readonly userInitials = computed(() => {
    const user = this.auth.currentUser();
    return (
      `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`.toUpperCase() ||
      'OH'
    );
  });

  protected toggleAssistant(): void {
    this.assistantOpen.update((open) => !open);
  }

  protected onAssistantInput(event: Event): void {
    this.assistantQuestion.set((event.target as HTMLTextAreaElement).value.slice(0, 1500));
  }

  protected async askRudolf(): Promise<void> {
    const question = this.assistantQuestion().trim();
    if (!question || this.assistantBusy()) return;
    this.assistantBusy.set(true);
    this.assistantError.set('');
    this.assistantAnswer.set('');
    try {
      const response = await this.hubAi.ask(question);
      await revealRudolfText(response.content, (text) => this.assistantAnswer.set(text));
      this.assistantQuestion.set('');
    } catch {
      this.assistantError.set('Rudolf est indisponible ou votre rôle ne permet pas cette analyse.');
    } finally {
      this.assistantBusy.set(false);
    }
  }

  protected toggleMenu(): void {
    this.menuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected toggleProfileMenu(): void {
    this.profileMenuOpen.update((open) => !open);
  }

  protected closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  protected accountRoleLabel(): string {
    const user = this.auth.currentUser();
    if (user?.role === 'admin') return 'Super administrateur';
    if (user?.hubRoles.includes('hub_admin')) return 'Administrateur Hub';
    if (user?.hubRoles.includes('hub_verifier')) return 'Vérificateur';
    if (user?.hubRoles.includes('hub_analyst')) return 'Analyste';
    return 'Lecteur autorisé';
  }

  protected async logout(): Promise<void> {
    this.profileMenuOpen.set(false);
    await this.auth.logout();
    await this.router.navigateByUrl('/connexion');
  }
}
