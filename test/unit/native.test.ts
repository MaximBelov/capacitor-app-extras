import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { AppLifecyclePlugin } from '../../src';

// What the native side of Capacitor injects into the web view: a bridge object that makes the platform 'android', the headers of
// the installed plugins, and nativePromise, which every promise method of a plugin goes through.
const nativePromise = vi.fn(async (): Promise<unknown> => undefined);
const g = globalThis as Record<string, unknown>;

let AppLifecycle: AppLifecyclePlugin;

beforeAll(async () => {
  g.androidBridge = {};
  g.Capacitor = {
    PluginHeaders: [
      {
        name: 'AppLifecycle',
        methods: [
          { name: 'forceClose', rtype: 'promise' },
          { name: 'getInfo', rtype: 'promise' },
        ],
      },
    ],
    nativePromise,
  };
  ({ AppLifecycle } = await import('../../src'));
});

afterAll(() => {
  delete g.androidBridge;
  delete g.Capacitor;
});

describe('on a native platform', () => {
  it('sends forceClose to the native plugin named AppLifecycle', async () => {
    await AppLifecycle.forceClose();
    expect(nativePromise).toHaveBeenCalledTimes(1);
    expect(nativePromise).toHaveBeenCalledWith('AppLifecycle', 'forceClose', undefined);
  });

  it('sends getInfo to the native plugin and resolves with what it answers', async () => {
    nativePromise.mockClear();
    nativePromise.mockResolvedValueOnce({ isiOSAppOnMac: false, freeDiskBytes: 1024 });
    await expect(AppLifecycle.getInfo()).resolves.toEqual({ isiOSAppOnMac: false, freeDiskBytes: 1024 });
    expect(nativePromise).toHaveBeenCalledWith('AppLifecycle', 'getInfo', undefined);
  });

  it('passes on what the native side answers', async () => {
    nativePromise.mockRejectedValueOnce(new Error('from native'));
    await expect(AppLifecycle.forceClose()).rejects.toThrow('from native');
  });
});
