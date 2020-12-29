
export function translate(messageName, substitutions = null) {
  try {
    return browser.i18n.getMessage(messageName, substitutions);
  } catch(error) {
    //console.error(error);
  }

  return undefined;
}
