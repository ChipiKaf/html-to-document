import { init, DocxAdapter } from 'html-to-document';
import { PDFAdapter } from 'html-to-document-adapter-pdf';
import { startContent1 } from './utils/constants';

export const run: () => Promise<any> = async () => {
  const editorContainer = document.getElementById('editor');
  if (!editorContainer) throw new Error('Entrypoint not found');

  // Append a textarea for TinyMCE.
  const textarea = document.createElement('textarea');
  editorContainer.append(textarea);

  // Dynamically import TinyMCE.
  const tinymceModule = await import('tinymce');
  const tinymce = tinymceModule.default;

  // Get convert function from the html-to-document package.
  const converter = init({
    tags: {
      defaultStyles: [
        {
          key: 'p',
          styles: {
            marginBottom: '1px',
            marginTop: '1px',
          },
        },
        {
          key: 'th',
          styles: {
            // Initially, we would have used textAlign: 'start',
            // But since we changed textAlign behavior in the style mappings (See the adapters options)
            // We now expect docx alignment values
            // textAlign: 'left',
          },
        },
      ],
    },
    adapters: {
      register: [
        {
          format: 'docx',
          adapter: DocxAdapter,
        },
        {
          format: 'pdf',
          adapter: PDFAdapter,
        },
      ],
      defaultStyles: [
        {
          format: 'docx',
          styles: {
            heading: {
              color: 'black',
              fontFamily: 'Aptos Display',
              marginTop: '10px',
              marginBottom: '10px',
            },
            paragraph: {
              lineHeight: 1.5,
            },
            'table-cell': {
              padding: '6.4px',
            },
          },
        },
        {
          format: 'pdf',
          styles: {
            heading: {
              color: 'black',
              fontFamily: 'Aptos Display',
              marginTop: '10px',
              marginBottom: '10px',
            },
            paragraph: {
              lineHeight: 1.5,
            },
            'table-cell': {
              padding: '6.4px',
            },
          },
        },
      ],
      styleMappings: [
        {
          format: 'docx',
          handlers: {
            // Changed the default textAlign handler from expecting the css standard ("start", "end", etc)
            // To expecting docx alignment values ("left", "right", etc)
            // textAlign: (v) => ({ alignment: v }),
          },
        },
      ],
    },
  });

  // Initialize editor
  tinymce.init({
    selector: 'textarea',
    height: window.innerHeight - 20,
    script_url: 'https://cdn.tiny.cloud/1/no-api-key/tinymce/7/tinymce.min.js',
    base_url: 'https://cdn.tiny.cloud/1/no-api-key/tinymce/7',
    plugins: 'lists link paste table code',
    toolbar:
      'undo redo | formatselect | bold italic underline | bullist numlist | alignleft aligncenter alignright | link | table | code | docx pdf',
    setup: (editor) => {
      editor.on('init', function () {
        console.log('TinyMCE editor is initialized');
        editor.setContent(startContent1);

        // Register a custom button on the toolbar named "docx".
        editor.ui.registry.addButton('docx', {
          icon: 'export-word',
          text: 'Export Word',
          tooltip: 'Generate DOCX from Editor Content',
          onAction: async () => {
            // 1. Retrieve HTML content.
            const htmlContent = editor.getContent();

            try {
              // 2. Convert HTML to DOCX format (returns a Promise<Buffer>).
              const parsedContent = await converter.parse(htmlContent);
              const docxBuffer = await converter.convert(parsedContent, 'docx');

              // 3. Create a Blob from the buffer.
              // If using a Node Buffer in a browser context, it can usually be passed directly.
              // Otherwise, you might need to convert the Buffer to an ArrayBuffer or Uint8Array.
              const blob = new Blob([docxBuffer as Blob], {
                type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              });

              // 4. Create an object URL and trigger the download.
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'document.docx'; // File name for the download.
              a.click();

              // Clean up the object URL after download.
              URL.revokeObjectURL(url);
            } catch (error) {
              console.error('Conversion failed:', error);
            }
          },
        });

        // Register a custom button on the toolbar named "pdf".
        editor.ui.registry.addButton('pdf', {
          icon: 'export',
          text: 'Export PDF',
          tooltip: 'Generate PDF from Editor Content',
          onAction: async () => {
            // 1. Retrieve HTML content.
            const htmlContent = editor.getContent();

            try {
              // 2. Convert HTML to PDF format (returns a Promise<Buffer>).
              const parsedContent = await converter.parse(htmlContent);
              console.log(parsedContent);
              const pdfBuffer = await converter.convert(parsedContent, 'pdf');

              // 3. Create a Blob from the buffer.
              const blob = new Blob([pdfBuffer as Blob], {
                type: 'application/pdf',
              });

              // 4. Create an object URL and trigger the download.
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'document.pdf'; // File name for the download.
              a.click();

              // Clean up the object URL after download.
              URL.revokeObjectURL(url);
            } catch (error) {
              console.error('PDF conversion failed:', error);
            }
          },
        });
      });
    },
  });
  const app = document.getElementById('app');
  if (!app) return;

  // if (process.env.USE_NPM_LATEST !== 'true') {
  //   app.innerHTML = `<p>Remember to run build in root and run install in /demo when you make changes to the html-to-document package</p>`;
  // } else {
  //   app.innerHTML = `<p>Test with the <b>Export Word</b> and <b>Export PDF</b> buttons</p>`;
  // }
};
