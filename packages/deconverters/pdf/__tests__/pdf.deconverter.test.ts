import { PDFDeconverter } from '../src/pdf.deconverter';
import fs from 'fs';

const samplePdf = fs.readFileSync('node_modules/pdf-parse/test/data/04-valid.pdf');

describe('PDFDeconverter', () => {
  it('converts a PDF Buffer to DocumentElement[]', async () => {
    const buffer = samplePdf;
    const deconv = new PDFDeconverter();
    const result = await deconv.deconvert(buffer);
    expect(result.length).toBeGreaterThan(0);
  });

  it('accepts a Blob as input', async () => {
    const blob = new Blob([samplePdf], { type: 'application/pdf' });
    const deconv = new PDFDeconverter();
    const result = await deconv.deconvert(blob);
    expect(result.length).toBeGreaterThan(0);
  });
});
