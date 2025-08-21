import {
  createTempFileName,
  isNodeEnvironment,
  isBrowserEnvironment,
} from '../src/pdf.util';
import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  MockedFunction,
  Mocked,
  Mock,
  MockedClass,
} from 'vitest';

describe('pdf.util', () => {
  describe('createTempFileName', () => {
    it('should create a temp filename with the correct extension', () => {
      const fileName = createTempFileName('pdf');
      expect(fileName).toMatch(/^temp-\d+-[a-z0-9]+\.pdf$/);
    });

    it('should create different filenames on subsequent calls', () => {
      const fileName1 = createTempFileName('docx');
      const fileName2 = createTempFileName('docx');
      expect(fileName1).not.toBe(fileName2);
    });

    it('should handle different extensions', () => {
      const pdfFile = createTempFileName('pdf');
      const docxFile = createTempFileName('docx');
      expect(pdfFile).toMatch(/\.pdf$/);
      expect(docxFile).toMatch(/\.docx$/);
    });
  });

  describe('isNodeEnvironment', () => {
    it('should return true when window is undefined', () => {
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
      });

      expect(isNodeEnvironment()).toBe(true);

      // Restore original window
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
      });
    });

    it('should return false when window is defined', () => {
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
      });

      expect(isNodeEnvironment()).toBe(false);

      // Restore original window
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
      });
    });
  });

  describe('isBrowserEnvironment', () => {
    it('should return false when window is undefined', () => {
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
      });

      expect(isBrowserEnvironment()).toBe(false);

      // Restore original window
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
      });
    });

    it('should return true when window is defined', () => {
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
      });

      expect(isBrowserEnvironment()).toBe(true);

      // Restore original window
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        writable: true,
      });
    });
  });
});
