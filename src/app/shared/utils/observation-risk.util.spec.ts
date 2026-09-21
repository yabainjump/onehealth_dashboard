import { toMapRiskLevel } from './observation-risk.util';

describe('observation risk utilities', () => {
  it('projects the four canonical severities into three map levels', () => {
    expect(toMapRiskLevel('low')).toBe('low');
    expect(toMapRiskLevel('medium')).toBe('medium');
    expect(toMapRiskLevel('high')).toBe('high');
    expect(toMapRiskLevel('critical')).toBe('high');
  });
});
