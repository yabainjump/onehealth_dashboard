import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrandLoaderComponent } from './brand-loader.component';

describe('BrandLoaderComponent', () => {
  let fixture: ComponentFixture<BrandLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrandLoaderComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BrandLoaderComponent);
  });

  it('renders the One Health logo and an accessible busy state', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('img')?.getAttribute('src')).toBe(
      'assets/brand/one-health-network-web.png',
    );
    expect(element.querySelector('[role="status"]')?.getAttribute('aria-busy')).toBe('true');
  });

  it('supports a compact loader for pending actions', () => {
    fixture.componentRef.setInput('mode', 'inline');
    fixture.componentRef.setInput('message', 'Connexion en cours…');
    fixture.detectChanges();

    const loader = (fixture.nativeElement as HTMLElement).querySelector('.brand-loader');
    expect(loader?.classList.contains('brand-loader--inline')).toBeTrue();
    expect(loader?.textContent).toContain('Connexion en cours…');
  });
});
