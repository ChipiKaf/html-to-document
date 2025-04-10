// Do not change this file. Instead add an _index.ts file. That will automatically override this file
export const run: () => Promise<any> = async () => {
  const editorContainer = document.getElementById('editor');
  editorContainer?.append(document.createElement('textarea'));

  // Import TinyMCE dynamically.
  const tinymceModule = await import('tinymce');
  const tinymce = tinymceModule.default;

  tinymce.init({
    selector: 'textarea',
    height: window.innerHeight - 20,
    script_url: 'https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js',
    base_url: 'https://cdn.tiny.cloud/1/no-api-key/tinymce/6',
    // Add plugins to enable lists and other formatting options.
    plugins: 'lists link paste table code',
    // Configure the toolbar to expose the buttons for these plugins.
    toolbar:
      'undo redo | formatselect | bold italic underline | bullist numlist | alignleft aligncenter alignright | link | table | code',
    setup: (editor: any) => {
      editor.on('init', function () {
        console.log('TinyMCE editor is initialized');
      });
    },
  });
};
