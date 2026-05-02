/**
 * core/insurance.js — Re-export shim
 *
 * 此檔已不再是 single source of truth。實際邏輯位於 monorepo
 * @choulegal/core-inheritance（~/Desktop/choulegal/packages/core-inheritance/）
 * 經由 scripts/build-core-bundle.mjs 編成 js/_generated/core-inheritance.bundle.js。
 *
 * 保留這層 re-export 是為了向後相容既有 ESM import path（避免一次大改 HTML）。
 * 新程式碼請直接從 bundle 或 ip-core-bridge 取用：
 *   import { calc... } from './_generated/core-inheritance.bundle.js';
 */
export * from '../_generated/core-inheritance.bundle.js';
