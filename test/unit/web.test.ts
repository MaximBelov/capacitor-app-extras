import { CapacitorException, ExceptionCode } from '@capacitor/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppExtras } from '../../src';
import { AppExtrasWeb, INSTALLATION_ID_STORAGE_KEY } from '../../src/web';

// No native bridge on globalThis, so Capacitor reports the platform as 'web' and loads src/web.ts. The Node environment has no
// localStorage and no navigator.storage, so each test stubs the ones it needs; afterEach puts the originals back.

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** A Storage backed by a Map, standing in for the browser's localStorage. */
function fakeStorage(entries: { [key: string]: string } = {}) {
  const map = new Map(Object.entries(entries));
  return {
    map,
    getItem: vi.fn((key: string) => map.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      map.set(key, String(value));
    }),
  };
}

/** A navigator whose storage.estimate() answers the given estimate. */
function navigatorWithEstimate(estimate: () => Promise<{ quota?: number; usage?: number }>) {
  return { ...globalThis.navigator, storage: { estimate: vi.fn(estimate) } };
}

/** A localStorage that throws on access, as browsers do when site data is blocked or in a sandboxed frame. */
function blockLocalStorage() {
  vi.stubGlobal('localStorage', undefined);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('getInfo on the web', () => {
  it('resolves through the registered plugin with the required fields of AppInfo', async () => {
    vi.stubGlobal('localStorage', fakeStorage());
    const info = await AppExtras.getInfo();
    expect(info.isiOSAppOnMac).toBe(false);
    expect(info.installationId).toMatch(UUID_V4);
  });

  it('answers the same installation id on every call, and stores it under the plugin key', async () => {
    const storage = fakeStorage();
    vi.stubGlobal('localStorage', storage);
    const web = new AppExtrasWeb();
    const first = (await web.getInfo()).installationId;
    const second = (await web.getInfo()).installationId;
    expect(first).toMatch(UUID_V4);
    expect(second).toBe(first);
    expect(storage.map.get(INSTALLATION_ID_STORAGE_KEY)).toBe(first);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it('keeps the installation id across a reload, which is a new plugin instance over the same storage', async () => {
    vi.stubGlobal('localStorage', fakeStorage());
    const before = (await new AppExtrasWeb().getInfo()).installationId;
    const after = (await new AppExtrasWeb().getInfo()).installationId;
    expect(after).toBe(before);
  });

  it('answers an id that is already stored as it is, and does not write', async () => {
    const storage = fakeStorage({ [INSTALLATION_ID_STORAGE_KEY]: 'kept-from-an-earlier-visit' });
    vi.stubGlobal('localStorage', storage);
    await expect(new AppExtrasWeb().getInfo()).resolves.toMatchObject({ installationId: 'kept-from-an-earlier-visit' });
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('replaces an empty stored id, so the id is never empty', async () => {
    const storage = fakeStorage({ [INSTALLATION_ID_STORAGE_KEY]: '' });
    vi.stubGlobal('localStorage', storage);
    const { installationId } = await new AppExtrasWeb().getInfo();
    expect(installationId).toMatch(UUID_V4);
    expect(storage.map.get(INSTALLATION_ID_STORAGE_KEY)).toBe(installationId);
  });

  it('falls back to one id per page load when reading localStorage throws', async () => {
    blockLocalStorage();
    const page = new AppExtrasWeb();
    const first = await page.getInfo();
    const second = await page.getInfo();
    expect(first.installationId).toMatch(UUID_V4);
    expect(second.installationId).toBe(first.installationId);
    // A reload is a new instance: without storage it gets a new id.
    const reloaded = await new AppExtrasWeb().getInfo();
    expect(reloaded.installationId).toMatch(UUID_V4);
    expect(reloaded.installationId).not.toBe(first.installationId);
  });

  it('falls back to one id per page load when writing localStorage throws', async () => {
    const storage = fakeStorage();
    storage.setItem.mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });
    vi.stubGlobal('localStorage', storage);
    const page = new AppExtrasWeb();
    const first = (await page.getInfo()).installationId;
    const second = (await page.getInfo()).installationId;
    expect(first).toMatch(UUID_V4);
    expect(second).toBe(first);
  });

  it('falls back to one id per page load when there is no localStorage at all', async () => {
    vi.stubGlobal('localStorage', undefined);
    const page = new AppExtrasWeb();
    const first = (await page.getInfo()).installationId;
    expect(first).toMatch(UUID_V4);
    expect((await page.getInfo()).installationId).toBe(first);
  });

  it('builds a UUID from getRandomValues where crypto.randomUUID is missing (a page that is not a secure context)', async () => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real) });
    vi.stubGlobal('localStorage', fakeStorage());
    const { installationId } = await new AppExtrasWeb().getInfo();
    expect(installationId).toMatch(UUID_V4);
  });

  it('answers quota - usage from navigator.storage.estimate() as freeDiskBytes', async () => {
    vi.stubGlobal('localStorage', fakeStorage());
    vi.stubGlobal(
      'navigator',
      navigatorWithEstimate(async () => ({ quota: 5_000_000_000, usage: 1_234_567 })),
    );
    await expect(new AppExtrasWeb().getInfo()).resolves.toMatchObject({ freeDiskBytes: 5_000_000_000 - 1_234_567 });
  });

  it('leaves freeDiskBytes out when navigator.storage.estimate is missing', async () => {
    vi.stubGlobal('localStorage', fakeStorage());
    vi.stubGlobal('navigator', { ...globalThis.navigator, storage: undefined });
    const info = await new AppExtrasWeb().getInfo();
    expect(info).not.toHaveProperty('freeDiskBytes');
    expect(Object.keys(info).sort()).toEqual(['installationId', 'isiOSAppOnMac']);
  });

  it('leaves freeDiskBytes out when there is no navigator', async () => {
    vi.stubGlobal('localStorage', fakeStorage());
    vi.stubGlobal('navigator', undefined);
    await expect(new AppExtrasWeb().getInfo()).resolves.not.toHaveProperty('freeDiskBytes');
  });

  it('leaves freeDiskBytes out, and still resolves, when the estimate rejects', async () => {
    vi.stubGlobal('localStorage', fakeStorage());
    vi.stubGlobal(
      'navigator',
      navigatorWithEstimate(async () => {
        throw new TypeError('estimate failed');
      }),
    );
    const info = await new AppExtrasWeb().getInfo();
    expect(info).not.toHaveProperty('freeDiskBytes');
    expect(info.installationId).toMatch(UUID_V4);
  });

  it('leaves freeDiskBytes out when the estimate does not report both numbers', async () => {
    vi.stubGlobal('localStorage', fakeStorage());
    vi.stubGlobal(
      'navigator',
      navigatorWithEstimate(async () => ({ usage: 10 })),
    );
    await expect(new AppExtrasWeb().getInfo()).resolves.not.toHaveProperty('freeDiskBytes');
  });

  it('leaves freeDiskBytes out when usage is above the quota', async () => {
    vi.stubGlobal('localStorage', fakeStorage());
    vi.stubGlobal(
      'navigator',
      navigatorWithEstimate(async () => ({ quota: 100, usage: 101 })),
    );
    await expect(new AppExtrasWeb().getInfo()).resolves.not.toHaveProperty('freeDiskBytes');
  });
});

describe('forceClose on the web', () => {
  it('rejects with UNIMPLEMENTED and says why, through the registered plugin', async () => {
    await expect(AppExtras.forceClose()).rejects.toMatchObject({
      code: ExceptionCode.Unimplemented,
      message:
        'forceClose is not available on the web: a page cannot reliably close its own tab or window. Reload or navigate instead.',
    });
  });

  it('rejects with a CapacitorException, not a plain Error', async () => {
    const error = await new AppExtrasWeb().forceClose().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CapacitorException);
  });

  it('does not navigate, reload or otherwise touch the page', async () => {
    // The Node environment has no window: a web implementation that tried to reload would throw a ReferenceError instead.
    const error = await AppExtras.forceClose().catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(ReferenceError);
  });
});
