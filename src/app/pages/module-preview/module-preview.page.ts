import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideConstruction } from '@lucide/angular';

interface ModulePreviewData {
  eyebrow: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-module-preview',
  imports: [RouterLink, LucideArrowLeft, LucideConstruction],
  template: `
    <section class="preview">
      <div class="preview__icon"><svg lucideConstruction size="26"></svg></div>
      <p>{{ data.eyebrow }}</p>
      <h1>{{ data.title }}</h1>
      <span>{{ data.description }}</span>
      <a class="oh-button" routerLink="/dashboard">
        <svg lucideArrowLeft size="16"></svg>
        Revenir à la vue stratégique
      </a>
    </section>
  `,
  styles: `
    :host { display: block; }
    .preview {
      min-height: min(620px, calc(100vh - 200px));
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 36px;
      border: 1px dashed var(--oh-border-strong);
      border-radius: var(--oh-radius-lg);
      background: linear-gradient(145deg, #fff, #f2f6fc);
      text-align: center;
    }
    .preview__icon {
      width: 56px;
      height: 56px;
      display: grid;
      place-items: center;
      border-radius: 15px;
      background: var(--oh-primary-100);
      color: var(--oh-primary-900);
    }
    p {
      margin: 22px 0 4px;
      color: var(--oh-primary-800);
      font-size: .72rem;
      font-weight: 750;
      letter-spacing: .1em;
      text-transform: uppercase;
    }
    h1 { margin: 0; font-size: clamp(1.75rem, 4vw, 2.5rem); letter-spacing: -.035em; }
    span { max-width: 590px; margin-top: 12px; color: var(--oh-ink-600); line-height: 1.65; }
    a { margin-top: 28px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModulePreviewPage {
  private readonly route = inject(ActivatedRoute);
  protected readonly data = this.route.snapshot.data as ModulePreviewData;
}
