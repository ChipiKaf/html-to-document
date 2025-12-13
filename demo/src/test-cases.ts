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
      'Verifies that table borders are NOT inherited by paragraphs inside cells. Also tests border rendering.',
    content: startContent4,
  },
];
