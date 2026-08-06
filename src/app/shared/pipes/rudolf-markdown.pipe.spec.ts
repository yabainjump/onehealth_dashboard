import { RudolfMarkdownPipe } from './rudolf-markdown.pipe';

describe('RudolfMarkdownPipe', () => {
  const pipe = new RudolfMarkdownPipe();

  it('renders headings, bold text and lists without visible markdown markers', () => {
    const html = pipe.transform('## Synthèse\n\n**Fait observé**\n- Santé humaine\n- Santé animale');
    expect(html).toContain('<h4>Synthèse</h4>');
    expect(html).toContain('<strong>Fait observé</strong>');
    expect(html).toContain('<ul><li>Santé humaine</li><li>Santé animale</li></ul>');
    expect(html).not.toContain('**');
  });

  it('escapes source HTML before applying the limited markdown renderer', () => {
    expect(pipe.transform('<img src=x onerror=alert(1)>')).toContain('&lt;img');
    expect(pipe.transform('<img src=x onerror=alert(1)>')).not.toContain('<img');
  });
});
