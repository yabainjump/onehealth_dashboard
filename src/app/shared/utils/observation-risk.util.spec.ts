import { isPulsingMapRiskLevel, toMapRiskLevel } from './observation-risk.util';

describe('observation risk utilities', () => {
  it('projects the four canonical severities into three map levels', () => {
    expect(toMapRiskLevel('low')).toBe('low');
    expect(toMapRiskLevel('medium')).toBe('medium');
    expect(toMapRiskLevel('high')).toBe('high');
    expect(toMapRiskLevel('critical')).toBe('high');
  });

  it('pulses medium and high levels but keeps low levels still', () => {
    expect(isPulsingMapRiskLevel('low')).toBeFalse();
    expect(isPulsingMapRiskLevel('medium')).toBeTrue();
    expect(isPulsingMapRiskLevel('high')).toBeTrue();
  });
});
