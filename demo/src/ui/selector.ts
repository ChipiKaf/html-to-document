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
    this.createStyles();
    this.createElements();
    this.renderList();
    this.loadInitialContent();
  }

  private setupListeners() {
    // Setup listeners logic moved to createElements or renderList directly
  }

  private createStyles() {
    // Styles are imported via ./styles.css
    // Ensure font is available
    const link = document.createElement('link');
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  private createElements() {
    // FAB
    const fab = document.createElement('button');
    fab.className = 'test-case-fab';
    fab.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
      Test Cases
    `;
    document.body.appendChild(fab);

    // Overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'test-case-overlay';
    document.body.appendChild(this.overlay);

    // Drawer
    this.drawer = document.createElement('div');
    this.drawer.className = 'test-case-drawer';
    this.drawer.innerHTML = `
      <div class="test-case-drawer-header">
        <h2>Select Test Case</h2>
        <button class="close-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="test-case-list" id="test-case-list"></div>
    `;
    document.body.appendChild(this.drawer);

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
    this.overlay.classList.add('open');
  }

  public close() {
    this.drawer.classList.remove('open');
    this.overlay.classList.remove('open');
  }
}

export const initSelector = (editorSetContent: (content: string) => void) => {
  return new TestCaseSelector(editorSetContent);
};
