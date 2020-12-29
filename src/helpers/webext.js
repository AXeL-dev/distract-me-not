
export function isWebExtension() {
  try {
    return !!browser.runtime.id;
  } catch (error) {
    return false;
  }
}

export function openOptionsPage() {
  browser.runtime.openOptionsPage();
  window.close();
}
