// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import bcrypt from 'bcryptjs';

// fix ReferenceError: dcodeIO is not defined
global.dcodeIO = { bcrypt };

// Mock chrome extension APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue(),
      getBytesInUse: jest.fn().mockResolvedValue(0),
      MAX_ITEMS: 512,
      QUOTA_BYTES: 102400,
      QUOTA_BYTES_PER_ITEM: 8192
    },
    local: {
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue(),
      clear: jest.fn().mockResolvedValue(),
      getBytesInUse: jest.fn().mockResolvedValue(0)
    }
  },
  runtime: {
    getManifest: jest.fn().mockReturnValue({ version: '1.0.0' }),
    getURL: jest.fn().mockImplementation((path) => `chrome-extension://mock-id/${path}`),
    id: 'mock-extension-id'
  },
  tabs: {
    query: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(),
    remove: jest.fn().mockResolvedValue(),
    create: jest.fn().mockResolvedValue()
  }
};

// ignore some specific console errors & warnings
const consoleError = console.error;
const consoleWarn = console.warn;

const errors = [
  /browser is not defined/i,
  /The `value` prop is required for the `<Context\.Provider>`/i,
  /Not implemented: window.prompt/i,
  /Warning: A component is changing a controlled input to be uncontrolled./i,
];

// prettier-ignore
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
