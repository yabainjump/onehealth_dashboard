import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideBookOpen,
  LucideCircleHelp,
  LucideDatabase,
  LucideFileText,
  LucideLifeBuoy,
  LucideLockKeyhole,
  LucideMap,
  LucideSearch,
  LucideShieldCheck,
  LucideSparkles,
  LucideTriangleAlert,
} from '@lucide/angular';
import { DashboardAuthService } from '../../core/auth/dashboard-auth.service';

interface HelpQuestion {
  readonly category: 'Données' | 'Alertes' | 'Accès' | 'Rudolf';
  readonly question: string;
  readonly answer: string;
}

const HELP_QUESTIONS: readonly HelpQuestion[] = [
  {
    category: 'Données',
    question: 'Quelle différence entre une observation, un signal et une alerte ?',
    answer:
      "Une observation est une donnée source normalisée. Un signal est une situation détectée qui doit être examinée. Une alerte n'est affichée comme vérifiée qu'après une décision humaine tracée.",
  },
  {
    category: 'Données',
    question: 'Pourquoi certaines données ou certains pays ne sont-ils pas visibles ?',
    answer:
      "Le Hub applique les politiques de souveraineté et le périmètre pays attribué à votre compte. Vous ne voyez que les données que votre rôle et les États membres vous autorisent à consulter.",
  },
  {
    category: 'Alertes',
    question: 'Comment examiner un signal ?',
    answer:
      "Ouvrez Alertes sanitaires, sélectionnez une fiche, consultez ses preuves et ses rapprochements, puis utilisez l'action de vérification si votre rôle le permet. La décision et sa justification sont journalisées.",
  },
  {
    category: 'Alertes',
    question: 'Rudolf peut-il valider une alerte ?',
    answer:
      "Non. Rudolf prépare des synthèses et explique les rapprochements disponibles. La validation d'une alerte reste exclusivement humaine et dépend des droits du compte.",
  },
  {
    category: 'Accès',
    question: 'Comment demander un autre rôle ou un nouvel État membre ?',
    answer:
      "Adressez la demande à l'administrateur Hub de votre institution. Les rôles et périmètres pays sont gérés dans Administration et ne peuvent pas être modifiés depuis le profil personnel.",
  },
  {
    category: 'Accès',
    question: 'Que faire si ma session expire ?',
    answer:
      "Reconnectez-vous depuis la page de connexion. Pour votre sécurité, le jeton du tableau de bord est conservé uniquement pendant la session du navigateur.",
  },
  {
    category: 'Rudolf',
    question: 'Sur quelles informations Rudolf répond-il ?',
    answer:
      "Dans le Dashboard, Rudolf travaille sur les données du Hub autorisées pour votre compte et sur le contexte de la page. Ses réponses sont une aide à l'analyse, pas une instruction médicale ni une décision officielle.",
  },
];

@Component({
  selector: 'app-help-page',
  imports: [
    RouterLink,
    LucideArrowRight,
    LucideBookOpen,
    LucideCircleHelp,
    LucideDatabase,
    LucideFileText,
    LucideLifeBuoy,
    LucideLockKeyhole,
    LucideMap,
    LucideSearch,
    LucideShieldCheck,
    LucideSparkles,
    LucideTriangleAlert,
  ],
  templateUrl: './help.page.html',
  styleUrl: './help.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpPage {
  protected readonly auth = inject(DashboardAuthService);
  protected readonly search = signal('');
  protected readonly questions = computed(() => {
    const query = this.normalize(this.search());
    if (!query) return HELP_QUESTIONS;
    return HELP_QUESTIONS.filter((item) =>
      this.normalize(`${item.category} ${item.question} ${item.answer}`).includes(query),
    );
  });

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value.slice(0, 120));
  }

  protected roleLabel(): string {
    const user = this.auth.currentUser();
    if (!user) return 'Utilisateur Hub';
    if (user.role === 'admin' || user.hubRoles.includes('hub_admin')) return 'Administrateur Hub';
    if (user.hubRoles.includes('hub_verifier')) return 'Vérificateur national';
    if (user.hubRoles.includes('hub_analyst')) return 'Analyste One Health';
    return 'Lecteur autorisé';
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
