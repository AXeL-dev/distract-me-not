export const isDevEnv = process.env.NODE_ENV === 'development';
export const isTestEnv = process.env.NODE_ENV === 'test';
export const isProdEnv = process.env.NODE_ENV === 'production';

// Add logInfo helper for consistency with service worker
export const logInfo = (message, data) => {
  console.log(`[DMN INFO] ${message}`, data || '');
};

// Add any other debug helpers
export const debug = {
  log: (...args) => {
    console.log('[DMN DEBUG]', ...args);
  },
  warn: (...args) => {
    console.warn('[DMN WARNING]', ...args);
  },
  error: (...args) => {
    console.error('[DMN ERROR]', ...args);
  }
};

export class report {
  static error(message, ...params) {
    !isDevEnv && console.error(message, ...params);
  }
}
