import { WebPlugin } from '@capacitor/core';

import type { AppInfo, AppLifecyclePlugin } from './definitions';

export class AppLifecycleWeb extends WebPlugin implements AppLifecyclePlugin {
  async forceClose(): Promise<void> {
    throw this.unimplemented('forceClose is not available on the web.');
  }

  async getInfo(): Promise<AppInfo> {
    throw this.unimplemented('getInfo is not available on the web.');
  }
}
