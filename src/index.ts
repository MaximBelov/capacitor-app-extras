import { registerPlugin } from '@capacitor/core';

import type { AppLifecyclePlugin } from './definitions';

const AppLifecycle = registerPlugin<AppLifecyclePlugin>('AppLifecycle', {
  web: () => import('./web').then((m) => new m.AppLifecycleWeb()),
});

export * from './definitions';
export { AppLifecycle };
