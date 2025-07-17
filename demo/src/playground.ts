import { DocumentElement, IDocumentConverter, init } from 'html-to-document';

class JsonAdapter implements IDocumentConverter {
  convert(elements: DocumentElement[]): Promise<Buffer | Blob> {
    return new Promise((resolve) => {
      const jsonContent = JSON.stringify(elements, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      resolve(blob);
    });
  }
}

addEventListener('DOMContentLoaded', () => {
  const outputJsonContainer = document.getElementById('output-json');
  const inputHtmlContainer = document.getElementById('input-html');

  const x = init({
    adapters: {
      register: [
        {
          format: 'json',
          adapter: JsonAdapter,
        },
      ],
    },
  });

  inputHtmlContainer?.addEventListener('input', async (event) => {
    const htmlData = (event.target as HTMLTextAreaElement).value;
    const output = await x.convert(htmlData, 'json');
    const outoutJsonString = await (output as Blob).text();

    outputJsonContainer!.textContent = outoutJsonString;
  });
});
