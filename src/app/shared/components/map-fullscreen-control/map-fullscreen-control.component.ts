import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewEncapsulation,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

interface LegacyFullscreenDocument extends Document {
  readonly webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

interface LegacyFullscreenElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

@Component({
  selector: 'app-map-fullscreen-control',
  standalone: true,
  template: `
    <button
      type="button"
      [attr.aria-label]="active() ? exitLabel() : enterLabel()"
      [attr.title]="active() ? exitLabel() : enterLabel()"
      [attr.aria-pressed]="active()"
      (click)="toggle()"
    >
      @if (active()) {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" />
        </svg>
      } @else {
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
        </svg>
      }
    </button>
  `,
  styles: `
    app-map-fullscreen-control {
      position: absolute;
      top: 12px;
      right: 52px;
      z-index: 800;
      display: block;
    }

    app-map-fullscreen-control.map-fullscreen-control--inline {
      position: static;
    }

    app-map-fullscreen-control button {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 1px solid rgb(195 210 220 / 78%);
      border-radius: 9px;
      background: rgb(255 255 255 / 94%);
      color: #28384d;
      cursor: pointer;
      box-shadow: 0 4px 14px rgb(7 28 43 / 18%);
      backdrop-filter: blur(8px);
    }

    app-map-fullscreen-control button:hover,
    app-map-fullscreen-control button:focus-visible,
    app-map-fullscreen-control button[aria-pressed='true'] {
      border-color: #8fa6c0;
      background: #fff;
      color: #0b3d7b;
    }

    app-map-fullscreen-control svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .ohn-map-fullscreen-host:fullscreen,
    .ohn-map-fullscreen-host.ohn-map-fullscreen-fallback {
      position: fixed !important;
      inset: 0 !important;
      z-index: 2147483000 !important;
      width: 100vw !important;
      max-width: none !important;
      height: 100vh !important;
      height: 100dvh !important;
      min-height: 100vh !important;
      min-height: 100dvh !important;
      margin: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: #17394c !important;
    }

    body.ohn-map-fullscreen-lock {
      overflow: hidden !important;
    }
  `,
  host: {
    '[class.map-fullscreen-control--inline]': 'inline()',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapFullscreenControlComponent implements OnDestroy {
  readonly target = input.required<HTMLElement>();
  readonly inline = input(false);
  readonly enterLabel = input('Afficher la carte en plein écran');
  readonly exitLabel = input('Quitter le plein écran');
  readonly fullscreenChange = output<boolean>();
  readonly active = signal(false);

  private readonly document = inject(DOCUMENT) as LegacyFullscreenDocument;
  private fallbackTarget?: HTMLElement;
  private readonly handleFullscreenChange = (): void => this.syncNativeState();
  private readonly handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.fallbackTarget) {
      this.disableFallback();
    }
  };

  constructor() {
    this.document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    this.document.addEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    this.document.addEventListener('keydown', this.handleKeydown);
  }

  ngOnDestroy(): void {
    this.document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    this.document.removeEventListener('webkitfullscreenchange', this.handleFullscreenChange);
    this.document.removeEventListener('keydown', this.handleKeydown);
    this.disableFallback();
  }

  async toggle(): Promise<void> {
    const target = this.target();
    target.classList.add('ohn-map-fullscreen-host');

    if (this.active()) {
      await this.exit(target);
      return;
    }

    // L'API native refuse les éléments détachés du document. Le mode CSS reste
    // utilisable dans ce cas (prévisualisation, WebView ou montage différé).
    if (!target.isConnected) {
      this.enableFallback(target);
      return;
    }

    const legacyTarget = target as LegacyFullscreenElement;
    try {
      if (target.requestFullscreen) {
        await target.requestFullscreen();
        return;
      }
      if (legacyTarget.webkitRequestFullscreen) {
        await legacyTarget.webkitRequestFullscreen();
        return;
      }
    } catch {
      // Un navigateur ou une WebView peut refuser l'API native : le fallback reste local au client.
    }

    this.enableFallback(target);
  }

  private async exit(target: HTMLElement): Promise<void> {
    if (this.fallbackTarget === target) {
      this.disableFallback();
      return;
    }

    try {
      if (this.document.fullscreenElement && this.document.exitFullscreen) {
        await this.document.exitFullscreen();
        return;
      }
      if (this.document.webkitFullscreenElement && this.document.webkitExitFullscreen) {
        await this.document.webkitExitFullscreen();
        return;
      }
    } catch {
      // L'état est resynchronisé ci-dessous même si la WebView refuse la sortie native.
    }
    this.setActive(false);
  }

  private syncNativeState(): void {
    const fullscreenElement =
      this.document.fullscreenElement ?? this.document.webkitFullscreenElement ?? null;
    this.setActive(fullscreenElement === this.target() || this.fallbackTarget === this.target());
  }

  private enableFallback(target: HTMLElement): void {
    this.fallbackTarget = target;
    target.classList.add('ohn-map-fullscreen-fallback');
    this.document.body.classList.add('ohn-map-fullscreen-lock');
    this.setActive(true);
  }

  private disableFallback(): void {
    this.fallbackTarget?.classList.remove('ohn-map-fullscreen-fallback');
    this.fallbackTarget = undefined;
    this.document.body.classList.remove('ohn-map-fullscreen-lock');
    if (this.active()) {
      this.setActive(false);
    }
  }

  private setActive(active: boolean): void {
    if (this.active() === active) {
      return;
    }
    this.active.set(active);
    this.fullscreenChange.emit(active);
    this.scheduleMapResize();
  }

  private scheduleMapResize(): void {
    const view = this.document.defaultView;
    view?.setTimeout(() => view.dispatchEvent(new Event('resize')), 60);
    view?.setTimeout(() => view.dispatchEvent(new Event('resize')), 320);
  }
}
