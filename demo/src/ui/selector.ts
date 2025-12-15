import { testCases, TestCase } from '../test-cases';
// @ts-ignore
import './styles.css';

export class TestCaseSelector {
  private editorSetContent: (content: string) => void;
  private currentCaseId: string = 'style-inheritance'; // Default to the newest one
  private container!: HTMLElement; // Use definite assignment assertion
  private drawer!: HTMLElement;
  private overlay!: HTMLElement;

  constructor(editorSetContent: (content: string) => void) {
    this.editorSetContent = editorSetContent;
    this.init();
  }

  private init() {
    this.bindElements();
    this.renderList();
    this.loadInitialContent();
  }

  private bindElements() {
    const fab = document.getElementById('test-case-fab');
    this.overlay = document.getElementById('test-case-overlay') as HTMLElement;
    this.drawer = document.getElementById('test-case-drawer') as HTMLElement;

    if (!fab || !this.overlay || !this.drawer) {
      console.warn('Test case selector elements not found in DOM');
      return;
    }

    // Toggle logic
    fab.addEventListener('click', () => this.open());
    this.overlay.addEventListener('click', () => this.close());
    this.drawer
      .querySelector('.close-btn')
      ?.addEventListener('click', () => this.close());
  }

  private renderList() {
    const list = this.drawer.querySelector('#test-case-list');
    if (!list) return;

    list.innerHTML = testCases
      .map(
        (tc) => `
      <div class="test-case-item ${tc.id === this.currentCaseId ? 'active' : ''}" data-id="${tc.id}">
        <span class="test-case-title">${tc.title}</span>
        <span class="test-case-desc">${tc.description}</span>
      </div>
    `
      )
      .join('');

    // Re-attach listeners to new items
    list.querySelectorAll('.test-case-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) this.selectCase(id);
      });
    });
  }

  private selectCase(id: string) {
    const tc = testCases.find((t) => t.id === id);
    if (!tc) return;

    this.currentCaseId = id;
    this.editorSetContent(tc.content);
    this.renderList(); // Re-render to update active state
    this.close();
  }

  private loadInitialContent() {
    const defaultCase = testCases.find((t) => t.id === this.currentCaseId);
    if (defaultCase) {
      // slight delay to ensure editor is ready if needed, though init is called after
      this.editorSetContent(defaultCase.content);
    }
  }

  public open() {
    this.drawer.classList.add('open');
  }

  public close() {
    this.drawer.classList.remove('open');
  }
}

export const initSelector = (editorSetContent: (content: string) => void) => {
  return new TestCaseSelector(editorSetContent);
};
