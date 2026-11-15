import { WebPlugin } from '@capacitor/core';

import type { AppInfo, AppExtrasPlugin } from './definitions';

/** The `localStorage` key the web implementation keeps the installation id under. Owned by this plugin. */
export const INSTALLATION_ID_STORAGE_KEY = 'CapacitorAppExtras.installationId';

/** How long the web waits before reloading, the same as iOS waits before it exits. */
export const FORCE_CLOSE_DELAY_MS = 300;

export class AppExtrasWeb extends WebPlugin implements AppExtrasPlugin {
  /** The id answered while `localStorage` cannot be used: one per page load, so that every call of that page agrees. */
  private pageLoadInstallationId?: string;

  private exitScheduled = false;

  /**
   * On the web the closest thing to ending the process is starting the page again: the app's root is loaded afresh,
   * which drops every in-memory state, as a new launch would. The promise resolves first, and the page is replaced
   * about 0.3 seconds later, as on iOS, so the caller can finish what it is doing.
   */
  async forceClose(): Promise<void> {
    if (this.exitScheduled) {
      return;
    }
    this.exitScheduled = true;
    setTimeout(() => {
      window.location.replace(document.baseURI);
    }, FORCE_CLOSE_DELAY_MS);
  }

  async getInfo(): Promise<AppInfo> {
    const info: AppInfo = {
      isiOSAppOnMac: false,
      installationId: this.readInstallationId(),
    };
    const freeDiskBytes = await readStorageBudgetBytes();
    if (freeDiskBytes !== undefined) {
      info.freeDiskBytes = freeDiskBytes;
    }
    return info;
  }

  /**
   * The id stored in `localStorage`, written there the first time. When the storage cannot be read or written (blocked
   * by the browser, a sandboxed frame, a full quota), a random id kept for the life of this page instead.
   */
  private readInstallationId(): string {
    try {
      const storage = globalThis.localStorage;
      const stored = storage.getItem(INSTALLATION_ID_STORAGE_KEY);
      if (stored) {
        return stored;
      }
      const id = randomId();
      storage.setItem(INSTALLATION_ID_STORAGE_KEY, id);
      return id;
    } catch {
      if (!this.pageLoadInstallationId) {
        this.pageLoadInstallationId = randomId();
      }
      return this.pageLoadInstallationId;
    }
  }
}

/**
 * `quota - usage` from `navigator.storage.estimate()`: what this origin may still store, which is a budget the browser
 * sets and not the free space of the disk. Undefined when the browser does not report it or the numbers make no sense.
 */
async function readStorageBudgetBytes(): Promise<number | undefined> {
  try {
    const storage = globalThis.navigator?.storage;
    if (typeof storage?.estimate !== 'function') {
      return undefined;
    }
    const { quota, usage } = await storage.estimate();
    if (typeof quota !== 'number' || typeof usage !== 'number') {
      return undefined;
    }
    const budget = quota - usage;
    return Number.isFinite(budget) && budget >= 0 ? budget : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A random version 4 UUID. `crypto.randomUUID` exists only in secure contexts (https, localhost), so a page served over
 * plain http builds one from `crypto.getRandomValues`, which is available everywhere.
 */
function randomId(): string {
  const crypto = globalThis.crypto;
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
