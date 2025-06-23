import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
//import { toaster } from 'evergreen-ui';
import { Settings } from 'components';

// Mock Chrome storage with default values
const mockStorageData = {
  isEnabled: true,
  mode: 'denyList',
  action: 'block-tab',
  blacklist: [],
  whitelist: [],
  blacklistKeywords: [],
  whitelistKeywords: [],
  blacklistLastModifiedDate: null,
  whitelistLastModifiedDate: null,
  blacklistKeywordsLastModifiedDate: null,
  whitelistKeywordsLastModifiedDate: null,
  framesType: ['all'], // Make this an array
  blockTab: {
    closeTab: false,
    showMessage: true,
    muteAudio: false,
  },
  unblock: {
    temporaryAccess: false,
    passwordChallenge: false,
  },  schedule: {
    type: 'none',
    days: {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    },
    timeRanges: [],
  },  password: {
    isEnabled: false,
    hashedPassword: '',
  },
  timer: {
    enabled: false,
    duration: 5,
  },
  logs: {
    enabled: false,
  },
  misc: {
    hideReportIssueButton: false,
    showAddWebsitePrompt: false,
    enableOnBrowserStartup: false,
  },
};

beforeEach(() => {
  // Reset Chrome storage mocks
  global.chrome.storage.local.get.mockResolvedValue(mockStorageData);
  global.chrome.storage.sync.get.mockResolvedValue({});
});

it('renders all tabs', () => {
  render(<Settings />);
  const blocking = screen.getByRole('tab', { name: /^blocking/i });
  const unblocking = screen.getByRole('tab', {
    name: /^unblocking/i,
  });
  const schedule = screen.getByRole('tab', { name: /^schedule/i });  const denyList = screen.getByRole('tab', { name: /^denyList/i });
  const allowList = screen.getByRole('tab', { name: /^allowList/i });
  const password = screen.getByRole('tab', { name: /^password/i });
  const timer = screen.getByRole('tab', { name: /^timer/i });
  const logs = screen.getByRole('tab', { name: /^logs/i });
  const miscellaneous = screen.getByRole('tab', {
    name: /^miscellaneous/i,
  });
  const about = screen.getByRole('tab', { name: /^about/i });
  expect(blocking).toBeInTheDocument();
  expect(unblocking).toBeInTheDocument();
  expect(schedule).toBeInTheDocument();
  expect(denyList).toBeInTheDocument();
  expect(allowList).toBeInTheDocument();
  expect(password).toBeInTheDocument();
  expect(timer).toBeInTheDocument();
  expect(logs).toBeInTheDocument();
  expect(miscellaneous).toBeInTheDocument();
  expect(about).toBeInTheDocument();
});

it('renders save button', () => {
  render(<Settings />);
  const saveButton = screen.getByRole('button', { name: 'save' });
  expect(saveButton).toBeInTheDocument();
});

it('saves settings on save button click', async () => {
  //const toasterSuccess = jest.spyOn(toaster, 'success');
  render(<Settings />);
  const saveButton = screen.getByRole('button', { name: 'save' });
  fireEvent.click(saveButton);
  const saveSuccessText = await waitFor(() => screen.getByText(/settingsSaved/i));
  expect(saveSuccessText).toBeInTheDocument();
  //expect(toasterSuccess).toBeCalled();
});

it('accepts only passwords that contains at least 8 characters', async () => {
  const passwords = [],
    minCharsNumber = 8;
  // fill passwords array with generic strings having length from 0 to 8
  for (let i = 0; i <= minCharsNumber; i++) {
    passwords.push(Array(i + 1).join('p'));
  }
  
  // Create custom mock data with password enabled
  const passwordEnabledMockData = {
    ...mockStorageData,
    password: {
      isEnabled: true,
      hashedPassword: '',
      isSet: false // Ensure it's not set so validation triggers
    }
  };
  
  // Override storage mock for this test
  global.chrome.storage.sync.get.mockResolvedValue(passwordEnabledMockData);
  global.chrome.storage.local.get.mockResolvedValue(passwordEnabledMockData);
  
  // Mock the toaster.danger call to verify validation
  const mockToasterDanger = jest.fn();
  const toaster = require('evergreen-ui').toaster;
  toaster.danger = mockToasterDanger;
  
  // render our component
  const { container } = render(<Settings enablePassword={true} />);
  
  // Wait for component to load the mocked data
  await waitFor(() => {
    const passwordInput = container.querySelector('input[type="password"]');
    expect(passwordInput).toBeInTheDocument();
  });
  
  const passwordInput = container.querySelector('input[type="password"]');
  const saveButton = screen.getByRole('button', { name: 'save' });
  
  // test passwords containing less than 8 characters
  for (let i = 0; i < minCharsNumber; i++) {
    mockToasterDanger.mockClear(); // Clear previous calls
    fireEvent.change(passwordInput, {
      target: { value: passwords[i] },
    });
    fireEvent.click(saveButton);
      // Wait for toaster call and verify it was called with correct message key
    await waitFor(() => {
      expect(mockToasterDanger).toHaveBeenCalledWith(
        'passwordIsShort',
        expect.any(Object)
      );
    });
  }
  
  // test correct password (having 8 chars)
  mockToasterDanger.mockClear();
  fireEvent.change(passwordInput, {
    target: { value: passwords[minCharsNumber] },
  });
  fireEvent.click(saveButton);
  
  // For valid password, toaster.danger should not be called
  await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
  expect(mockToasterDanger).not.toHaveBeenCalled();
}, 30000);
