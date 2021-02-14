// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import bcrypt from 'bcryptjs';

// fix ReferenceError: dcodeIO is not defined
global.dcodeIO = { bcrypt };

// ignore some specific console errors & warnings
const consoleError = console.error;
const consoleWarn = console.warn;

const errors = [
  /browser is not defined/i,
  /The `value` prop is required for the `<Context\.Provider>`/i,
  /Not implemented: window.prompt/i,
];

const warnings = [
  /componentWillReceiveProps has been renamed/i,
];

console.error = (message, ...params) => {
  for (const error of errors) {
    if (error.test(message)) {
      return;
    }
  }
  consoleError(message, ...params);
};

console.warn = (message, ...params) => {
  for (const warning of warnings) {
    if (warning.test(message)) {
      return;
    }
  }
  consoleWarn(message, ...params);
};
