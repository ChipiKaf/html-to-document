import { startContent1, startContent2, startContent3 } from './utils/constants';
import { startContent4 } from './utils/test-content';

export interface TestCase {
  id: string;
  title: string;
  description: string;
  content: string;
}

export const testCases: TestCase[] = [
  {
    id: 'basic',
    title: 'Basic Content',
    description:
      'Simple paragraphs, headings, and lists to test basic functionality.',
    content: startContent1,
  },
  {
    id: 'complex',
    title: 'Complex Layout',
    description:
      'Includes nested lists, tables, and images to test complex structure parsing.',
    content: startContent2,
  },
  {
    id: 'page-structure',
    title: 'Page Structure',
    description: 'Tests page breaks, headers, and footers.',
    content: startContent3,
  },
  {
    id: 'style-inheritance',
    title: 'Style Inheritance (Table Borders)',
    description:
      'Verifies correct border behavior. Default: Borders on cell only. Custom: Borders on paragraphs too (if configured).',
    content: startContent4,
  },
  {
    id: 'forced-inheritance',
    title: 'Forced Border Inheritance',
    description:
      'Explicitly designed to show cascading borders when `styleInheritance` is enabled.',
    content: `
      <div>
        <h1>Forced Inheritance Test</h1>
        <p>If <code>styleInheritance.border.inherits</code> is true, the paragraph inside the box should have a blue border (inheriting from the cell).</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="border: 2px solid blue; padding: 20px;">
              <p>I should have a blue border if inheritance is ON.</p>
              <p>I should NOT have a border if inheritance is OFF.</p>
            </td>
          </tr>
        </table>
      </div>
    `,
  },
];
