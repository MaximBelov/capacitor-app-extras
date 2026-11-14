import { WebPlugin } from '@capacitor/core';

import type { AppLifecyclePlugin } from './definitions';

export class AppLifecycleWeb extends WebPlugin implements AppLifecyclePlugin {
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }
}
