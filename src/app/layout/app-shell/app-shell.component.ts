import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { PopoverModule } from 'primeng/popover';
import { TextareaModule } from 'primeng/textarea';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
import { OneHealthDataService } from '../../core/data/one-health-data.service';
import { HubAiApiService } from '../../core/data/hub-ai-api.service';
import { RudolfMarkdownPipe } from '../../shared/pipes/rudolf-markdown.pipe';
import { revealRudolfText } from '../../shared/utils/reveal-rudolf-text';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';

interface HubAssistantMessage {
  readonly id: number;
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    DrawerModule,
    InputTextModule,
    PopoverModule,
    TextareaModule,
    RudolfMarkdownPipe,
    TranslatePipe,
    LanguageSwitcherComponent,
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  @ViewChild('assistantConversation')
  private assistantConversation?: ElementRef<HTMLElement>;

  protected readonly auth = inject(DashboardAuthService);
  protected readonly dataService = inject(OneHealthDataService);
  private readonly router = inject(Router);
  private readonly hubAi = inject(HubAiApiService);
  private readonly i18n = inject(I18nService);
  protected readonly menuOpen = signal(false);
  protected readonly assistantOpen = signal(false);
  protected readonly assistantQuestion = signal('');
  protected readonly assistantMessages = signal<readonly HubAssistantMessage[]>([]);
  protected readonly assistantError = signal('');
  protected readonly assistantBusy = signal(false);
  protected readonly assistantSuggestions = computed(() => [
    this.i18n.t('shell.rudolf.suggestion.regional'),
    this.i18n.t('shell.rudolf.suggestion.priority'),
    this.i18n.t('shell.rudolf.suggestion.sectors'),
  ]);
  private nextAssistantMessageId = 1;
  private scrollQueued = false;
  protected readonly userInitials = computed(() => {
    const user = this.auth.currentUser();
    return (
      `${user?.firstName?.charAt(0) || ''}${user?.lastName?.charAt(0) || ''}`.toUpperCase() || 'OH'
    );
  });

  protected toggleAssistant(): void {
    this.assistantOpen.update((open) => !open);
  }

  protected onAssistantInput(event: Event): void {
    this.assistantQuestion.set((event.target as HTMLTextAreaElement).value.slice(0, 1500));
  }

  protected startAssistantConversation(): void {
    if (this.assistantBusy()) return;
    this.assistantQuestion.set('');
    this.assistantMessages.set([]);
    this.assistantError.set('');
  }

  protected useAssistantSuggestion(question: string): void {
    if (this.assistantBusy()) return;
    this.assistantQuestion.set(question);
    void this.askRudolf();
  }

  protected async askRudolf(): Promise<void> {
    const question = this.assistantQuestion().trim();
    if (!question || this.assistantBusy()) return;
    this.assistantBusy.set(true);
    this.assistantError.set('');
    this.assistantQuestion.set('');
    const userMessage: HubAssistantMessage = {
      id: this.nextAssistantMessageId++,
      role: 'user',
      content: question,
    };
    const assistantMessage: HubAssistantMessage = {
      id: this.nextAssistantMessageId++,
      role: 'assistant',
      content: '',
    };
    this.assistantMessages.update((messages) => [...messages, userMessage, assistantMessage]);
    this.queueAssistantScroll();
    try {
      const response = await this.hubAi.ask(question);
      await revealRudolfText(response.content, (content) => {
        this.updateAssistantMessage(assistantMessage.id, content);
        this.queueAssistantScroll();
      });
    } catch (error: unknown) {
      this.assistantMessages.update((messages) =>
        messages.filter((message) => message.id !== assistantMessage.id),
      );
      this.assistantQuestion.set(question);
      this.assistantError.set(this.assistantErrorMessage(error));
    } finally {
      this.assistantBusy.set(false);
      this.queueAssistantScroll();
    }
  }

  private updateAssistantMessage(id: number, content: string): void {
    this.assistantMessages.update((messages) =>
      messages.map((message) => (message.id === id ? { ...message, content } : message)),
    );
  }

  private assistantErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 429) return this.i18n.t('shell.rudolf.rateLimit');
      if (error.status === 504) return this.i18n.t('shell.rudolf.timeout');
    }
    return this.i18n.t('shell.rudolf.unavailable');
  }

  private queueAssistantScroll(): void {
    if (this.scrollQueued) return;
    this.scrollQueued = true;
    requestAnimationFrame(() => {
      this.scrollQueued = false;
      const element = this.assistantConversation?.nativeElement;
      element?.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((isOpen) => !isOpen);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
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
    this.assistantOpen.set(false);
    this.assistantQuestion.set('');
    this.assistantMessages.set([]);
    this.assistantError.set('');
    // logout() clears local identity and Hub data before its first await.
    // Do not keep the protected outlet visible while server revocation waits.
    const revocation = this.auth.logout();
    try {
      await this.router.navigateByUrl('/connexion');
    } finally {
      await revocation;
    }
  }
}
