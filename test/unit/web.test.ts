import { CapacitorException, ExceptionCode } from '@capacitor/core';
import { describe, expect, it } from 'vitest';

import { AppLifecycle } from '../../src';
import { AppLifecycleWeb } from '../../src/web';

// No native bridge on globalThis, so Capacitor reports the platform as 'web' and loads src/web.ts.
describe('on the web', () => {
  it('rejects forceClose with UNIMPLEMENTED through the registered plugin', async () => {
    await expect(AppLifecycle.forceClose()).rejects.toMatchObject({
      code: ExceptionCode.Unimplemented,
      message: 'forceClose is not available on the web.',
    });
  });

  it('rejects with a CapacitorException, not a plain Error', async () => {
    const error = await new AppLifecycleWeb().forceClose().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CapacitorException);
  });

  it('does not navigate, reload or otherwise touch the page', async () => {
    // The Node environment has no window: a web implementation that tried to reload would throw a ReferenceError instead.
    const error = await AppLifecycle.forceClose().catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(ReferenceError);
  });
});
