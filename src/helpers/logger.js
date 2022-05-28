import { storage } from './webext';
import { isDevEnv } from './debug';
import { now } from './date';

export const defaultLogsSettings = {
  isEnabled: false,
  maxLength: 100,
};

const logsDataset = [{
  url: 'https://www.website1.com',
  blocked: false,
  date: now(true),
}, {
  url: 'https://www.website2.com',
  blocked: true,
  date: now(true),
}, {
  url: 'https://www.website3.com',
  blocked: true,
  date: now(true),
}];

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
    if (isDevEnv) {
      return Promise.resolve(logsDataset);
    }
    // prettier-ignore
    return storage
      .get({ logs: [] })
      .then(({ logs = [] } = {}) => logs);
  }

  static clear() {
    return storage.set({ logs: [] });
  }
}
