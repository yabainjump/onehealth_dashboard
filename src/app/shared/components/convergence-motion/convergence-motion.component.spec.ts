import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConvergenceMotionComponent } from './convergence-motion.component';

describe('ConvergenceMotionComponent', () => {
  let fixture: ComponentFixture<ConvergenceMotionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConvergenceMotionComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConvergenceMotionComponent);
  });

  it('renders the local One Health convergence visual', () => {
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('svg')).not.toBeNull();
    expect(host.querySelector('img')?.getAttribute('src')).toBe(
      'assets/brand/one-health-network.png',
    );
  });

  it('applies the dark treatment used by the login page', () => {
    fixture.componentRef.setInput('tone', 'dark');
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.motion-field--dark'),
    ).not.toBeNull();
  });
});
