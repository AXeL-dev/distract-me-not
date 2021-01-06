// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// ignore some specific console error messages
const consoleError = console.error;

console.error = (message, ...params) => {
  if (!/browser is not defined/i.test(message)) {
    consoleError(message, ...params);
  }
};
