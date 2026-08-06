export function revealRudolfText(
  content: string,
  update: (visibleText: string) => void,
): Promise<void> {
  if (!content || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    update(content);
    return Promise.resolve();
  }

  const duration = Math.min(3600, Math.max(900, content.length * 2));
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const frame = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const characterCount = Math.ceil(content.length * (1 - (1 - progress) ** 2));
      update(content.slice(0, characterCount));
      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}
