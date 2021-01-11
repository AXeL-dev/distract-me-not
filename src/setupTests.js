// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// ignore some specific console errors/warnings
const consoleError = console.error;
const consoleWarn = console.warn;

console.error = (message, ...params) => {
  if (!/browser is not defined/i.test(message)) {
    consoleError(message, ...params);
  }
};

console.warn = (message, ...params) => {
  if (!/componentWillReceiveProps has been renamed/i.test(message)) {
    consoleWarn(message, ...params);
  }
};
