export function capitalize(str, lowerizeNextLetters = false) {
  return (
    str.charAt(0).toUpperCase() +
    (lowerizeNextLetters ? str.slice(1).toLowerCase() : str.slice(1))
  );
}
