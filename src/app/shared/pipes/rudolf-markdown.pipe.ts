import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'rudolfMarkdown', standalone: true })
export class RudolfMarkdownPipe implements PipeTransform {
  transform(value: string): string {
    const lines = this.escape(value).replace(/\r\n?/g, '\n').split('\n');
    const html: string[] = [];
    let list: 'ul' | 'ol' | null = null;

    const closeList = () => {
      if (list) html.push(`</${list}>`);
      list = null;
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) {
        closeList();
        continue;
      }
      if (/^#{1,3}\s*$/.test(line)) continue;

      const heading = /^(#{1,3})\s+(.+)$/.exec(line);
      if (heading) {
        closeList();
        const level = Math.min(heading[1].length + 2, 5);
        html.push(`<h${level}>${this.inline(heading[2])}</h${level}>`);
        continue;
      }

      const bullet = /^[-*•]\s+(.+)$/.exec(line);
      const numbered = /^\d+[.)]\s+(.+)$/.exec(line);
      if (bullet || numbered) {
        const nextList = bullet ? 'ul' : 'ol';
        if (list !== nextList) {
          closeList();
          list = nextList;
          html.push(`<${list}>`);
        }
        html.push(`<li>${this.inline((bullet ?? numbered)![1])}</li>`);
        continue;
      }

      closeList();
      if (line.startsWith('&gt; ')) {
        html.push(`<blockquote>${this.inline(line.slice(5))}</blockquote>`);
      } else {
        html.push(`<p>${this.inline(line)}</p>`);
      }
    }
    closeList();
    return html.join('');
  }

  private inline(value: string): string {
    return value
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\*+/g, '');
  }

  private escape(value: string): string {
    return (value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    })[character]!);
  }
}
