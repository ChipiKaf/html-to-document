import { Converter } from 'html-to-document';

export const run: () => Promise<any> = async () => {
  const editorContainer = document.getElementById('editor');
  if (!editorContainer) throw new Error('Entrypoint not found');

  // Append a textarea for TinyMCE.
  editorContainer.append(document.createElement('textarea'));

  // Dynamically import TinyMCE.
  const tinymceModule = await import('tinymce');
  const tinymce = tinymceModule.default;
  const converter = new Converter();

  // Initialize TinyMCE.
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
        // Register a custom button on the toolbar named "mydocx".
        editor.ui.registry.addButton('docx', {
          icon: 'export-word',
          text: 'Export word',
          tooltip: 'Generate DOCX from Editor Content',
          onAction: async () => {
            // Get the current content from TinyMCE.
            const htmlContent = editor.getContent();
            console.log('HTML Content:', htmlContent);
          },
        });
      });
    },
  });
};
