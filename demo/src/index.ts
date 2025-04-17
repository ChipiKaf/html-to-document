import { init } from 'html-to-document';
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
            marginBottom: '5px',
            marginTop: '5px',
          },
        },
      ],
    },
    adapters: {
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
      'undo redo | formatselect | bold italic underline | bullist numlist | alignleft aligncenter alignright | link | table | code | docx',
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
              const docxBuffer = await converter.convert(htmlContent, 'docx');

              // 3. Create a Blob from the buffer.
              // If using a Node Buffer in a browser context, it can usually be passed directly.
              // Otherwise, you might need to convert the Buffer to an ArrayBuffer or Uint8Array.
              const blob = new Blob([docxBuffer], {
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
      });
    },
  });
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `<p>Remember to run build in root and run install in /demo when you make changes to the html-to-document package`;
};
