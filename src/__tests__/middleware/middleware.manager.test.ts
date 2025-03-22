import { MiddlewareManager } from '../../middleware';

describe('MiddlewareManager', () => {
  let manager: MiddlewareManager;

  beforeEach(() => {
    manager = new MiddlewareManager();
  });

  it('returns input unchanged when no middleware registered', async () => {
    const html = '<p>Test</p>';
    await expect(manager.execute(html)).resolves.toBe(html);
  });

  it('executes a single synchronous middleware', async () => {
    manager.use(async (html) => html + 'X');
    await expect(manager.execute('A')).resolves.toBe('AX');
  });

  it('executes a single asynchronous middleware', async () => {
    manager.use(async (html) => Promise.resolve(html + 'Y'));
    await expect(manager.execute('B')).resolves.toBe('BY');
  });

  it('executes middleware in registration order', async () => {
    manager.use(async (html) => html + '1');
    manager.use(async (html) => html + '2');
    manager.use(async (html) => html + '3');
    await expect(manager.execute('Start')).resolves.toBe('Start123');
  });

  it('propagates errors thrown in middleware', async () => {
    manager.use((html) => {
      throw new Error('fail');
    });
    await expect(manager.execute('')).rejects.toThrow('fail');
  });
});
