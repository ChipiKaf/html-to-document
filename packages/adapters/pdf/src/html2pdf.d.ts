declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: {
      type?: string;
      quality?: number;
    };
    html2canvas?: {
      scale?: number;
      [key: string]: any;
    };
    jsPDF?: {
      unit?: string;
      format?: string;
      orientation?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf;
    from(element: HTMLElement | string): Html2Pdf;
    outputPdf(type: 'blob'): Promise<Blob>;
    outputPdf(type: 'datauristring'): Promise<string>;
    outputPdf(type: 'datauri'): Promise<string>;
    outputPdf(): Promise<any>;
    save(): Promise<void>;
    then(onResolve: (pdf: any) => any, onReject?: (error: any) => any): Promise<any>;
  }

  function html2pdf(): Html2Pdf;

  export = html2pdf;
  export as namespace html2pdf;
}