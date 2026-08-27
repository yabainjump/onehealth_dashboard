import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideEye, LucideEyeOff, LucideLockKeyhole, LucideMail } from '@lucide/angular';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';
import { BrandLoaderComponent } from '../../shared/components/brand-loader/brand-loader.component';
import { ConvergenceMotionComponent } from '../../shared/components/convergence-motion/convergence-motion.component';

@Component({
  selector: 'app-login-page',
  imports: [
    ReactiveFormsModule,
    BrandLoaderComponent,
    ConvergenceMotionComponent,
    LucideEye,
    LucideEyeOff,
    LucideLockKeyhole,
    LucideMail,
  ],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(DashboardAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(254)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(128)],
    }),
  });
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);

  protected togglePassword(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    try {
      const user = await this.auth.login(
        this.form.controls.email.value,
        this.form.controls.password.value,
      );
      if (!this.auth.hasHubAccess(user)) {
        await this.router.navigateByUrl('/acces-refuse');
        return;
      }

      const requestedUrl = this.route.snapshot.queryParamMap.get('retour') ?? '';
      const safeUrl =
        requestedUrl.startsWith('/') && !requestedUrl.startsWith('//')
          ? requestedUrl
          : '/dashboard';
      await this.router.navigateByUrl(safeUrl);
    } catch (error: unknown) {
      this.errorMessage.set(error instanceof Error ? error.message : 'La connexion a échoué.');
    } finally {
      this.submitting.set(false);
    }
  }
}
