# HTML-to-Document Demo

**Live Demo:** [https://html-to-document-demo.vercel.app/](https://html-to-document-demo.vercel.app/)

This directory contains a demonstration application for the `html-to-document` library. It allows you to test various HTML structures and see how they are converted to DOCX.

## Features

- **Live Preview**: See the input HTML in a TinyMCE editor.
- **Instant Conversion**: Click "Download DOCX" to trigger the conversion.
- **Test Case Selector**: Quickly switch between different test scenarios using the floating "Test Cases" button.
- **Visual Feedback**: The test cases include descriptions and expected outcomes.

## Running the Demo

1.  Navigate to the demo directory:
    ```bash
    cd demo
    ```
2.  Install dependencies (if not already done at root):
    ```bash
    pnpm install
    ```
3.  Start the development server:
    ```bash
    pnpm run dev
    ```
4.  Open your browser at the URL shown (usually `http://localhost:5173`).

## Usage

### Selecting Test Cases

Click the floating list icon in the bottom-right corner to open the Test Case Selector. You can browse through categories like "Basic Content", "Complex Layout", "Page Structure", etc. Clicking a test case will automatically populate the editor.

### Adding New Test Cases

To add your own test scenarios, modify the `src/test-cases.ts` file:

```typescript
import { TestCase } from './test-cases';

export const testCases: TestCase[] = [
  // ... existing cases
  {
    id: 'my-new-test',
    title: 'My Custom Test',
    description: 'Testing a specific border case.',
    content: `
      <div>
        <h1>My Test</h1>
        <p>Some content...</p>
      </div>
    `,
  },
];
```

The app will hot-reload, and your new test case will appear in the list.

### Configuring the Converter

The main entry point is `src/index.ts`. Here you can configure the `init` function, add custom tags, middleware, or modify style inheritance rules.

```typescript
// src/index.ts
const converter = init({
  // Override inheritance (e.g., force borders to inherit)
  // styleInheritance: { ... },
  tags: { ... }
});
```
