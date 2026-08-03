import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideLockKeyhole } from '@lucide/angular';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';

@Component({
  selector: 'app-access-denied-page',
  imports: [LucideLockKeyhole],
  template: `
    <main class="denied-page">
      <section>
        <img src="assets/brand/one-health-icon.png" alt="Logo One Health Network" width="58" height="58">
        <span class="icon"><svg lucideLockKeyhole size="25"></svg></span>
        <h1>Accès au Hub non attribué</h1>
        <p>
          Votre compte One Health Network est valide, mais aucun rôle institutionnel ni pays
          autorisé ne lui a encore été attribué.
        </p>
        <div class="instructions">
          Demandez à un administrateur de configurer votre accès dans
          <strong>Administration → Utilisateurs → Accès Hub</strong>.
        </div>
        <button type="button" [disabled]="leaving()" (click)="logout()">
          {{ leaving() ? 'Déconnexion…' : 'Se déconnecter' }}
        </button>
      </section>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; }
    .denied-page { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #f5f8fc; }
    section { width: min(100%, 540px); padding: 42px; border: 1px solid var(--oh-border); border-radius: 18px; background: #fff; box-shadow: 0 20px 60px rgb(20 45 80 / 10%); text-align: center; }
    img { border-radius: 50%; }
    .icon { width: 52px; height: 52px; display: grid; place-items: center; margin: 28px auto 18px; border-radius: 14px; background: #eef4fc; color: var(--oh-primary-900); }
    h1 { margin: 0 0 12px; color: var(--oh-ink-950); font-size: 1.7rem; letter-spacing: -.03em; }
    p { margin: 0; color: var(--oh-ink-600); font-size: .88rem; line-height: 1.65; }
    .instructions { margin: 24px 0; padding: 14px; border-radius: 10px; background: #f7f9fc; color: var(--oh-ink-700); font-size: .76rem; line-height: 1.55; }
    button { min-height: 44px; padding: 0 22px; border: 0; border-radius: 9px; background: var(--oh-primary-900); color: #fff; font-weight: 680; cursor: pointer; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessDeniedPage {
  private readonly auth = inject(DashboardAuthService);
  private readonly router = inject(Router);
  protected readonly leaving = signal(false);

  protected async logout(): Promise<void> {
    this.leaving.set(true);
    await this.auth.logout();
    await this.router.navigateByUrl('/connexion');
  }
}
