import {
  DocumentElement,
  DocxAdapter,
  IDocumentConverter,
  init,
} from 'html-to-document';

class JsonAdapter implements IDocumentConverter {
  convert(elements: DocumentElement[]): Promise<Buffer | Blob> {
    return new Promise((resolve) => {
      const jsonContent = JSON.stringify(elements, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      resolve(blob);
    });
  }
}

const converter = init({
  adapters: {
    register: [
      {
        format: 'json',
        adapter: JsonAdapter,
      },
      {
        format: 'docx',
        adapter: DocxAdapter,
      },
    ],
  },
});

addEventListener('DOMContentLoaded', () => {
  const outputJsonContainer = document.getElementById('output-json');
  const inputHtmlContainer = document.getElementById('input-html');

  inputHtmlContainer?.addEventListener('input', async (event) => {
    const htmlData = (event.target as HTMLTextAreaElement).value;
    const output = await converter.convert(htmlData, 'json');
    const outoutJsonString = await (output as Blob).text();

    outputJsonContainer!.textContent = outoutJsonString;
  });
});

const exportDocxButton = document.getElementById('export-docx');
exportDocxButton?.addEventListener('click', async () => {
  const inputHtmlContainer = document.getElementById('input-html');
  const htmlData = (inputHtmlContainer as HTMLTextAreaElement).value;

  const output = await converter.convert(htmlData, 'docx');
  const blob = output as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'document.docx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
