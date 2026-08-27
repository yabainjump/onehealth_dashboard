import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  LucideActivity,
  LucideArrowRight,
  LucideDatabase,
  LucideGlobe2,
  LucideMap,
  LucideNetwork,
  LucidePawPrint,
  LucideShieldCheck,
  LucideSparkles,
  LucideStethoscope,
  LucideTrees,
  LucideWorkflow,
} from '@lucide/angular';
import { ConvergenceMotionComponent } from '../../shared/components/convergence-motion/convergence-motion.component';

@Component({
  selector: 'app-landing-page',
  imports: [
    RouterLink,
    LucideActivity,
    LucideArrowRight,
    LucideDatabase,
    LucideGlobe2,
    LucideMap,
    LucideNetwork,
    LucidePawPrint,
    LucideShieldCheck,
    LucideSparkles,
    LucideStethoscope,
    LucideTrees,
    LucideWorkflow,
    ConvergenceMotionComponent,
  ],
  templateUrl: './landing.page.html',
  styleUrl: './landing.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPage implements AfterViewInit, OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private revealObserver?: IntersectionObserver;

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const elements = this.host.nativeElement.querySelectorAll<HTMLElement>('[data-reveal]');
    if (
      !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      elements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          this.revealObserver?.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    elements.forEach((element) => this.revealObserver?.observe(element));
  }

  protected moveIntelligenceVisual(event: PointerEvent): void {
    if (event.pointerType === 'touch') return;
    const visual = event.currentTarget as HTMLElement;
    const rect = visual.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    visual.style.setProperty('--pointer-x', `${x * 12}px`);
    visual.style.setProperty('--pointer-y', `${y * 10}px`);
  }

  protected resetIntelligenceVisual(event: PointerEvent): void {
    const visual = event.currentTarget as HTMLElement;
    visual.style.setProperty('--pointer-x', '0px');
    visual.style.setProperty('--pointer-y', '0px');
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
  }
}
