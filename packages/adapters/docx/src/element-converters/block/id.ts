// import { DocumentElement, Styles } from 'html-to-document-core';
// import { ElementConverterDependencies, IBlockConverter } from '../types';
// import { FileChild } from 'docx';
//
// type DocumentElementType = DocumentElement & {
//   attributes: {
//     id: string;
//   };
// };
//
// const convertingIdMetadataKey = 'isConvertingId';
//
// export class IdBlockConverter implements IBlockConverter<DocumentElementType> {
//   public isMatch(element: DocumentElement): element is DocumentElementType {
//     return (
//       !!element.attributes?.id && !element.metadata?.[convertingIdMetadataKey]
//     );
//   }
//
//   public convertEement(dependencies: ElementConverterDependencies, element: DocumentElementType, cascadedStyles?: Styles) {
//     const { converter } = dependencies;
//   }
// }
