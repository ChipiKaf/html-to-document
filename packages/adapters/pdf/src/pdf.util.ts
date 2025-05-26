// Placeholder for PDF utility functions
// May include functions like handleChildren and isInline, adapted for PDFKit

export function isInline(element: {
  type?: string;
  styles?: { display?: string };
}): boolean {
  // Basic implementation, expand as needed
  return (
    ['text', 'image'].includes(element?.type || '') &&
    !element?.styles?.display?.includes('block')
  );
}

// Placeholder for a more sophisticated handleChildren if needed for PDF
export async function handleChildren(
  handlers: Record<string, (el: unknown, styles: unknown) => Promise<unknown>>,
  elements: Array<{ type: string; styles?: Record<string, unknown> }>,
  parentStyles: Record<string, unknown>
): Promise<unknown[]> {
  const results = [];
  for (const el of elements) {
    const handler = handlers[el.type];
    if (handler) {
      results.push(
        await handler(el, { ...parentStyles, ...(el.styles || {}) })
      );
    }
  }
  return results;
}
