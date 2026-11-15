import { WebPlugin } from '@capacitor/core';

import type { AppInfo, AppExtrasPlugin } from './definitions';

export class AppExtrasWeb extends WebPlugin implements AppExtrasPlugin {
  async forceClose(): Promise<void> {
    throw this.unimplemented('forceClose is not available on the web.');
  }

  async getInfo(): Promise<AppInfo> {
    throw this.unimplemented('getInfo is not available on the web.');
  }
}
