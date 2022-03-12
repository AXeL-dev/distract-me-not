import { isWebExtension } from './webext';

export function isSmallDevice() {
  return window.innerWidth < 900;
}

export async function isAndroidDevice() {
  if (!isWebExtension) {
    return false;
  }
  const platform = await browser.runtime.getPlatformInfo();
  return platform.os === 'android';
}
