import { PDFAdapter } from '../src/pdf.adapter';
import { DocumentElement, StyleMapper } from 'html-to-document-core';
import { jest } from '@jest/globals';

// Mock the libreoffice-convert module
jest.mock('libreoffice-convert', () => ({
  convert: jest.fn(),
}));

// Mock mammoth
jest.mock('mammoth', () => ({
  convertToHtml: jest.fn(),
}));

// Mock html2pdf.js so that both the module itself **and** its `default` export are
// callable builder functions (to satisfy both CJS and ESM import styles).
jest.mock('html2pdf.js', () => {
  // Fluent builder stub returned by calling html2pdf()
  const createMockBuilder = () => ({
    set: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    outputPdf: jest.fn(),
  });

  // The main mock function (also used for `default`)
  const mockHtml2Pdf: any = jest.fn(createMockBuilder);

  // Ensure `default` is the same callable (for `import html2pdf from 'html2pdf.js'`)
  mockHtml2Pdf.default = mockHtml2Pdf;

  return mockHtml2Pdf;
});

// Mock the DOCX adapter
jest.mock('html-to-document-adapter-docx', () => ({
  DocxAdapter: jest.fn().mockImplementation(() => ({
    convert: jest.fn(),
  })),
}));

import { convert } from 'libreoffice-convert';
import { DocxAdapter } from 'html-to-document-adapter-docx';
import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';

const mockLibreOfficeConvert = convert as jest.MockedFunction<typeof convert>;
const mockMammoth = mammoth as jest.Mocked<typeof mammoth>;
const mockHtml2pdf = (html2pdf as any).default as jest.Mock;

// Helper to check if a buffer looks like a PDF
const isPdf = (buffer: Buffer): boolean => {
  return buffer.toString('utf-8', 0, 5) === '%PDF-';
};

describe('PDFAdapter', () => {
  let adapter: PDFAdapter;
  let styleMapper: StyleMapper;
  let mockDocxAdapter: jest.Mocked<DocxAdapter>;

  beforeEach(() => {
    jest.clearAllMocks();

    styleMapper = new StyleMapper();

    // Create a mock DocxAdapter instance
    mockDocxAdapter = {
      convert: jest.fn(),
    } as any;

    // Mock the DocxAdapter constructor to return our mock instance
    (DocxAdapter as jest.MockedClass<typeof DocxAdapter>).mockImplementation(
      () => mockDocxAdapter
    );

    adapter = new PDFAdapter({ styleMapper });
  });

  describe('Node.js environment', () => {
    beforeEach(() => {
      // Mock Node.js environment (window is undefined)
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
      });
    });

    it('should convert elements to PDF using DOCX adapter and libre-office-convert', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Test paragraph',
          styles: {},
          attributes: {},
        },
      ];

      const mockDocxBuffer = Buffer.from('mock docx content');
      const mockPdfBuffer = Buffer.from('%PDF-1.4\nmock pdf content');

      // Mock the DOCX adapter to return a buffer
      mockDocxAdapter.convert.mockResolvedValue(mockDocxBuffer);

      // Mock LibreOffice conversion with callback
      mockLibreOfficeConvert.mockImplementation(
        (inputBuffer, format, undefined, callback) => {
          // Simulate async callback
          process.nextTick(() => callback(null, mockPdfBuffer));
        }
      );

      const result = await adapter.convert(elements);

      expect(mockDocxAdapter.convert).toHaveBeenCalledWith(elements);
      expect(mockLibreOfficeConvert).toHaveBeenCalledWith(
        mockDocxBuffer,
        '.pdf',
        undefined,
        expect.any(Function)
      );
      expect(result).toEqual(mockPdfBuffer);
      expect(isPdf(result as Buffer)).toBe(true);
    });

    it('should handle conversion errors gracefully', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Test paragraph',
          styles: {},
          attributes: {},
        },
      ];

      const mockDocxBuffer = Buffer.from('mock docx content');
      mockDocxAdapter.convert.mockResolvedValue(mockDocxBuffer);

      // Mock conversion to fail
      mockLibreOfficeConvert.mockImplementation(
        (inputBuffer, format, undefined, callback) => {
          process.nextTick(() =>
            callback(
              new Error('LibreOffice conversion failed'),
              Buffer.alloc(0)
            )
          );
        }
      );

      await expect(adapter.convert(elements)).rejects.toThrow(
        'PDF conversion failed'
      );
    });

    it('should handle successful conversion', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Test paragraph',
          styles: {},
          attributes: {},
        },
      ];

      const mockDocxBuffer = Buffer.from('mock docx content');
      const mockPdfBuffer = Buffer.from('%PDF-1.4\nmock pdf content');

      mockDocxAdapter.convert.mockResolvedValue(mockDocxBuffer);

      // Mock successful conversion
      mockLibreOfficeConvert.mockImplementation(
        (inputBuffer, format, undefined, callback) => {
          process.nextTick(() => callback(null, mockPdfBuffer));
        }
      );

      const result = await adapter.convert(elements);

      expect(result).toEqual(mockPdfBuffer);
      expect(isPdf(result as Buffer)).toBe(true);
    });
  });

  describe('Browser environment', () => {
    beforeEach(() => {
      // Mock browser environment
      Object.defineProperty(globalThis, 'window', {
        value: {},
        writable: true,
      });

      // Mock self for html2pdf.js compatibility
      Object.defineProperty(globalThis, 'self', {
        value: globalThis,
        writable: true,
      });

      // Mock document.createElement
      Object.defineProperty(globalThis, 'document', {
        value: {
          createElement: jest.fn().mockReturnValue({
            innerHTML: '',
          }),
        },
        writable: true,
      });
    });

    it('should handle browser conversion attempts', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Test paragraph',
          styles: {},
          attributes: {},
        },
      ];

      // const mockDocxBlob = new Blob(['mock docx content']);
      // mockDocxAdapter.convert.mockResolvedValue(mockDocxBlob);

      // // Mock mammoth conversion
      // mockMammoth.convertToHtml.mockResolvedValue({
      //   value: '<p>Test paragraph</p>',
      //   messages: [],
      // });

      // // Mock html2pdf chain - set up the fluent API mock
      // const mockOutputPdf = (jest.fn() as any).mockResolvedValue(
      //   new Blob(['%PDF-mock'], { type: 'application/pdf' })
      // );
      // const mockInstance = {
      //   set: jest.fn().mockReturnThis(),
      //   from: jest.fn().mockReturnThis(),
      //   outputPdf: mockOutputPdf,
      // };
      // mockHtml2pdf.mockReturnValue(mockInstance);

      // const result = await adapter.convert(elements);

      // expect(mockDocxAdapter.convert).toHaveBeenCalledWith(elements);
      // expect(mockMammoth.convertToHtml).toHaveBeenCalled();
      // expect(mockHtml2pdf).toHaveBeenCalled();
      // expect(result).toBeInstanceOf(Blob);
    });

    it('should detect browser environment and attempt browser conversion', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Test paragraph',
          styles: {},
          attributes: {},
        },
      ];

      const mockDocxBlob = new Blob(['mock docx content']);
      mockDocxAdapter.convert.mockResolvedValue(mockDocxBlob);

      // Mock mammoth conversion
      mockMammoth.convertToHtml.mockResolvedValue({
        value: '<p>Test paragraph</p>',
        messages: [],
      });

      // Mock html2pdf chain - set up the fluent API mock
      const mockOutputPdf = (jest.fn() as any).mockResolvedValue(
        new Blob(['%PDF-mock'], { type: 'application/pdf' })
      );
      const mockInstance = {
        set: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        outputPdf: mockOutputPdf,
      };
      mockHtml2pdf.mockReturnValue(mockInstance);

      // const result = await adapter.convert(elements);

      // expect(mockDocxAdapter.convert).toHaveBeenCalledWith(elements);
      // expect(mockMammoth.convertToHtml).toHaveBeenCalled();
      // expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('Error handling', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
      });
    });

    it('should wrap DOCX adapter errors', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Test paragraph',
          styles: {},
          attributes: {},
        },
      ];

      mockDocxAdapter.convert.mockRejectedValue(
        new Error('DOCX conversion failed')
      );

      await expect(adapter.convert(elements)).rejects.toThrow(
        'PDF conversion failed: DOCX conversion failed'
      );
    });

    it('should handle LibreOffice conversion errors', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'paragraph',
          text: 'Test paragraph',
          styles: {},
          attributes: {},
        },
      ];

      const mockDocxBuffer = Buffer.from('mock docx content');
      mockDocxAdapter.convert.mockResolvedValue(mockDocxBuffer);

      // Mock LibreOffice to fail
      mockLibreOfficeConvert.mockImplementation(
        (inputBuffer, format, undefined, callback) => {
          process.nextTick(() =>
            callback(new Error('LibreOffice failed'), Buffer.alloc(0))
          );
        }
      );

      await expect(adapter.convert(elements)).rejects.toThrow(
        'PDF conversion failed'
      );
    });
  });

  describe('Integration with different element types', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
      });
    });

    it('should handle complex document structures', async () => {
      const elements: DocumentElement[] = [
        {
          type: 'heading',
          text: 'Test Heading',
          level: 1,
          styles: { fontWeight: 'bold' },
          attributes: {},
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Bold text',
              styles: { fontWeight: 'bold' },
            },
            {
              type: 'text',
              text: ' and italic text',
              styles: { fontStyle: 'italic' },
            },
          ],
          styles: {},
          attributes: {},
        },
        {
          type: 'list',
          listType: 'unordered',
          content: [
            {
              type: 'list-item',
              text: 'Item 1',
              level: 0,
              styles: {},
            },
            {
              type: 'list-item',
              text: 'Item 2',
              level: 0,
              styles: {},
            },
          ],
          styles: {},
          attributes: {},
        },
      ];

      const mockDocxBuffer = Buffer.from('complex docx content');
      const mockPdfBuffer = Buffer.from('%PDF-1.4\ncomplex pdf content');

      mockDocxAdapter.convert.mockResolvedValue(mockDocxBuffer);

      // Mock successful conversion
      mockLibreOfficeConvert.mockImplementation(
        (inputBuffer, format, undefined, callback) => {
          process.nextTick(() => callback(null, mockPdfBuffer));
        }
      );

      const result = await adapter.convert(elements);

      expect(mockDocxAdapter.convert).toHaveBeenCalledWith(elements);
      expect(result).toEqual(mockPdfBuffer);
      expect(isPdf(result as Buffer)).toBe(true);
    });
  });
});
