import { registerPlugin } from '@capacitor/core';

import type { AppExtrasPlugin } from './definitions';

const AppExtras = registerPlugin<AppExtrasPlugin>('AppExtras', {
  web: () => import('./web').then((m) => new m.AppExtrasWeb()),
});

export * from './definitions';
export { AppExtras };
