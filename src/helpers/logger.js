import { storage } from 'helpers/webext';

export class logger {

  static async add(data) {
    const logs = await this.get();
    logs.unshift(data);
    if (logs.length > 100) {
      logs.splice(-1 * (logs.length - 100));
    }
    return storage.set({ logs });
  }

  static get() {
    return storage
      .get({ logs: [] })
      .then(({ logs = [] } = {}) => logs);
  }

  static clear() {
    return storage.set({ logs: [] });
  }

}
