
export function getTextTranslation(key, defaultValue) {
  try {
    return browser.i18n.getMessage(key);
  } catch(error) {
    //console.error(error);
  }

  return defaultValue;
}
