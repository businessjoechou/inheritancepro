/**
 * Global type declarations for InheritancePro
 *
 * This file provides type information for globally-available functions
 * injected by <script> tags (e.g., pdf-export.js) and browser APIs
 * that are not part of the standard DOM typings.
 */

interface Window {
  /** Provided by js/pdf-export.js — generates and downloads a PDF from HTML */
  exportPDF?: (html: string, filename: string) => Promise<void>;
}

/** Google Analytics gtag() — injected by GA4 snippet */
declare function gtag(command: string, ...args: any[]): void;
