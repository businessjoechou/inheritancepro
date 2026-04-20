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

  /** Supabase runtime config injected by js/config.js */
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;

  /** Capacitor native bridge (only present in native wrapper build) */
  Capacitor?: { isNativePlatform: () => boolean };

  /** Injected by js/components/save-button.js initSaveButton() */
  IP_clearAllDrafts?: () => void;
  /** Injected by js/pdf-export.js — extracts structured sections from a result container for PDF export */
  extractPdfSections?: (body: Element) => any[];
  /** Injected by js/components/save-button.js */
  initSaveButton?: (opts?: any) => void;
}

/** Google Analytics gtag() — injected by GA4 snippet */
declare function gtag(command: string, ...args: any[]): void;
