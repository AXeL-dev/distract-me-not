import { storage } from './webext';

export const defaultLogsSettings = {
  isEnabled: false,
  maxLength: 100,
};

export class logger {
  static maxLength = defaultLogsSettings.maxLength;

  static async add(data) {
    const logs = await this.get();
    logs.unshift(data);
    if (logs.length > this.maxLength) {
      logs.splice(-1 * (logs.length - this.maxLength));
    }
    return storage.set({ logs });
  }

  static get() {
    // prettier-ignore
    return storage
      .get({ logs: [] })
      .then(({ logs = [] } = {}) => logs);
  }

  static clear() {
    return storage.set({ logs: [] });
  }
}
