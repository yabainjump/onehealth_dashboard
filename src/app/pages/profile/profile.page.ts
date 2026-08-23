import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideBadgeCheck,
  LucideBriefcase,
  LucideCheckCircle2,
  LucideLandmark,
  LucideLockKeyhole,
  LucideMail,
  LucideMapPin,
  LucideSave,
  LucideShieldCheck,
  LucideUserRound,
} from '@lucide/angular';
import {
  DashboardAuthService,
  DashboardLoginError,
} from '../../core/auth/dashboard-auth.service';
import { HubRole } from '../../core/auth/dashboard-user.model';
import { CEEAC_COUNTRIES } from '../../core/data/mock/ceeac-reference';
import { resolveMediaUrl } from '../../core/utils/media-url.util';

const HUB_ROLE_LABELS: Readonly<Record<HubRole, string>> = {
  hub_viewer: 'Lecture',
  hub_analyst: 'Analyse',
  hub_verifier: 'Vérification',
  hub_admin: 'Administration Hub',
};

@Component({
  selector: 'app-profile-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideBadgeCheck,
    LucideBriefcase,
    LucideCheckCircle2,
    LucideLandmark,
    LucideLockKeyhole,
    LucideMail,
    LucideMapPin,
    LucideSave,
    LucideShieldCheck,
    LucideUserRound,
  ],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly auth = inject(DashboardAuthService);
  protected readonly saving = signal(false);
  protected readonly successMessage = signal('');
  protected readonly errorMessage = signal('');
  protected readonly avatarAvailable = signal(true);

  protected readonly profileForm = this.formBuilder.nonNullable.group({
    firstName: ['', [Validators.required, Validators.pattern(/.*\S.*/), Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.pattern(/.*\S.*/), Validators.maxLength(100)]],
    username: [
      '',
      [
        Validators.required,
        Validators.pattern(/.*\S.*/),
        Validators.minLength(3),
        Validators.maxLength(40),
      ],
    ],
    institution: [
      '',
      [Validators.required, Validators.pattern(/.*\S.*/), Validators.maxLength(150)],
    ],
    typeMedecin: ['', [Validators.maxLength(120)]],
    country: ['', [Validators.maxLength(100)]],
    city: ['', [Validators.maxLength(100)]],
    phone: [
      '',
      [Validators.maxLength(25), Validators.pattern(/^(\+?[0-9\s().-]{7,20})?$/)],
    ],
    bio: ['', [Validators.maxLength(250)]],
  });

  protected readonly photoUrl = computed(() => resolveMediaUrl(this.auth.currentUser()?.photoURL));
  protected readonly initials = computed(() => {
    const user = this.auth.currentUser();
    const first = user?.firstName?.trim().charAt(0) || '';
    const last = user?.lastName?.trim().charAt(0) || '';
    return `${first}${last}`.toUpperCase() || user?.username?.slice(0, 2).toUpperCase() || 'OH';
  });
  protected readonly countryScopes = computed(() => {
    const user = this.auth.currentUser();
    const codes = user?.hubCountryCodes ?? [];
    if (user?.role === 'admin' || user?.hubRoles.includes('hub_admin')) {
      return ['Périmètre régional complet'];
    }
    return codes.map(
      (code) => CEEAC_COUNTRIES.find((country) => country.code === code)?.name ?? code,
    );
  });

  protected readonly countryNames = CEEAC_COUNTRIES.map((country) => country.name);

  constructor() {
    this.resetForm();
  }

  protected roleLabel(): string {
    const user = this.auth.currentUser();
    if (!user) return 'Utilisateur Hub';
    if (user.role === 'admin') return 'Super administrateur';
    if (user.hubRoles.includes('hub_admin')) return 'Administrateur Hub';
    if (user.hubRoles.includes('hub_verifier')) return 'Vérificateur';
    if (user.hubRoles.includes('hub_analyst')) return 'Analyste';
    return 'Lecteur';
  }

  protected hubRoleLabels(): readonly string[] {
    return (this.auth.currentUser()?.hubRoles ?? []).map((role) => HUB_ROLE_LABELS[role]);
  }

  protected certificationLabel(): string {
    const user = this.auth.currentUser();
    if (user?.isCertified || user?.certificationStatus === 'approved') return 'Profil certifié';
    if (user?.certificationStatus === 'pending') return 'Certification en cours';
    return 'Profil non certifié';
  }

  protected joinedAt(): string {
    const value = this.auth.currentUser()?.createdAt;
    if (!value) return 'Date indisponible';
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
      new Date(value),
    );
  }

  protected onAvatarError(): void {
    this.avatarAvailable.set(false);
  }

  protected resetForm(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.profileForm.reset({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      institution: user.institution || '',
      typeMedecin: user.typeMedecin || '',
      country: user.country || '',
      city: user.city || '',
      phone: user.phone || '',
      bio: user.bio || '',
    });
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  protected async saveProfile(): Promise<void> {
    if (this.profileForm.invalid || this.saving()) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');
    const value = this.profileForm.getRawValue();
    try {
      const user = await this.auth.updateProfile({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        username: value.username.trim(),
        institution: value.institution.trim(),
        typeMedecin: value.typeMedecin.trim(),
        country: value.country.trim(),
        city: value.city.trim(),
        phone: value.phone.trim(),
        bio: value.bio.trim(),
      });
      this.profileForm.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        institution: user.institution,
        typeMedecin: user.typeMedecin || '',
        country: user.country || '',
        city: user.city || '',
        phone: user.phone || '',
        bio: user.bio || '',
      });
      this.successMessage.set('Votre profil a été mis à jour.');
    } catch (error: unknown) {
      this.errorMessage.set(
        error instanceof DashboardLoginError ? error.message : 'La mise à jour a échoué.',
      );
    } finally {
      this.saving.set(false);
    }
  }
}
