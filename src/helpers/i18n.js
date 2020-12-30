import translations from '../../public/_locales/en/messages';

export function translate(messageName, substitutions = null) {
  try {
    return browser.i18n.getMessage(messageName, substitutions);
  } catch(error) {
    //console.error(error);
  }

  return translations[messageName] ? translations[messageName].message : messageName;
}
