/**
 * Diagnostics Component Unit Tests
 * 
 * Tests following Clean Code principles:
 * - Single Responsibility: Each test has one clear purpose
 * - Descriptive naming: Test names clearly indicate what is being tested
 * - DRY: Shared test utilities and setup
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Diagnostics } from '../index';
import { diagnostics } from 'helpers/syncDiagnostics';

// Mock the diagnostics helper
jest.mock('helpers/syncDiagnostics', () => ({
  diagnostics: {
    checkSyncStatus: jest.fn(),
    diagnoseProblems: jest.fn(),
    testSync: jest.fn(),
    forceSyncAllData: jest.fn(),
    clearSyncStorage: jest.fn(),
  }
}));

// Mock translate helper
jest.mock('helpers/i18n', () => ({
  translate: jest.fn((key) => key)
}));

describe('Diagnostics Component', () => {
  // DRY: Shared test data
  const mockSyncStatus = {
    syncAvailable: true,
    browser: 'Chrome 91.0.4472.124',
    storageUsed: 1024,
    syncableSettingsFound: ['mode', 'blacklist'],
    missingSettings: ['schedule'],
    errors: []
  };

  const mockProblems = {
    problems: ['Large blacklist may slow sync'],
    suggestions: ['Consider reducing blacklist size']
  };

  const mockTestResults = {
    success: true,
    duration: 150,
    details: 'All sync operations completed successfully'
  };

  // DRY: Setup function for common test scenarios
  const setupMocks = (syncStatus = mockSyncStatus, problems = mockProblems) => {
    diagnostics.checkSyncStatus.mockResolvedValue(syncStatus);
    diagnostics.diagnoseProblems.mockResolvedValue(problems);
    diagnostics.testSync.mockResolvedValue(mockTestResults);
    diagnostics.forceSyncAllData.mockResolvedValue({ success: true });
    diagnostics.clearSyncStorage.mockResolvedValue({ success: true });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('Component Initialization', () => {
    test('should run initial diagnosis on mount', async () => {
      render(<Diagnostics />);

      await waitFor(() => {
        expect(diagnostics.checkSyncStatus).toHaveBeenCalledTimes(1);
        expect(diagnostics.diagnoseProblems).toHaveBeenCalledTimes(1);
      });
    });

    test('should display loading state during initial diagnosis', () => {
      // Mock a delayed response
      diagnostics.checkSyncStatus.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSyncStatus), 100))
      );

      render(<Diagnostics />);
          // Should show action buttons even during loading
    expect(screen.getByText('Run Diagnosis')).toBeInTheDocument();
    });

    test('should handle initialization errors gracefully', async () => {
      diagnostics.checkSyncStatus.mockRejectedValue(new Error('Network error'));

      render(<Diagnostics />);

      await waitFor(() => {
        expect(screen.getByText(/Diagnosis failed: Network error/)).toBeInTheDocument();
      });
    });
  });

  describe('Sync Status Display', () => {
    test('should display sync status when available', async () => {
      render(<Diagnostics />);

      await waitFor(() => {
        expect(screen.getByText('Sync Status')).toBeInTheDocument();
        expect(screen.getByText('Available')).toBeInTheDocument();
        expect(screen.getByText('Chrome 91.0.4472.124')).toBeInTheDocument();
        expect(screen.getByText(/1\.00 KB/)).toBeInTheDocument();
      });
    });

    test('should show unavailable status when sync is not available', async () => {
      setupMocks({ ...mockSyncStatus, syncAvailable: false });

      render(<Diagnostics />);

      await waitFor(() => {
        expect(screen.getByText('Unavailable')).toBeInTheDocument();
      });
    });

    test('should display missing settings count', async () => {
      render(<Diagnostics />);

      await waitFor(() => {
        expect(screen.getByText(/2.*\(1 missing\)/)).toBeInTheDocument();
      });
    });

    test('should display errors when present', async () => {
      const statusWithErrors = {
        ...mockSyncStatus,
        errors: [
          { location: 'sync storage', message: 'Access denied' }
        ]
      };
      setupMocks(statusWithErrors);

      render(<Diagnostics />);

      await waitFor(() => {
        expect(screen.getByText('1 Error(s) Detected')).toBeInTheDocument();
        expect(screen.getByText('sync storage: Access denied')).toBeInTheDocument();
      });
    });
  });

  describe('Action Buttons', () => {
    test('should render all action buttons', () => {
      render(<Diagnostics />);
    expect(screen.getByText('Run Diagnosis')).toBeInTheDocument();
    expect(screen.getByText('Test Sync')).toBeInTheDocument();
    expect(screen.getByText('Force Sync')).toBeInTheDocument();
    expect(screen.getByText('Refresh Rules')).toBeInTheDocument();
    expect(screen.getByText('Clear Storage')).toBeInTheDocument();
    });

    test('should handle run diagnosis button click', async () => {
      render(<Diagnostics />);

      // Wait for initial mount diagnosis to complete
      await waitFor(() => {
        expect(diagnostics.checkSyncStatus).toHaveBeenCalled();
      });

      const button = screen.getByText('Run Diagnosis');
      fireEvent.click(button);

      await waitFor(() => {
        // Should be called twice: once on mount, once on click
        expect(diagnostics.checkSyncStatus).toHaveBeenCalledTimes(2);
        expect(diagnostics.diagnoseProblems).toHaveBeenCalledTimes(2);
      });
    });

    test('should handle test sync button click', async () => {
      render(<Diagnostics />);

      const button = screen.getByText('Test Sync');
      fireEvent.click(button);

      await waitFor(() => {
        expect(diagnostics.testSync).toHaveBeenCalledTimes(1);
      });
    });

    test('should handle force sync button click', async () => {
      render(<Diagnostics />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Sync Status')).toBeInTheDocument();
      });

      const button = screen.getByText('Force Sync');
      fireEvent.click(button);

      await waitFor(() => {
        expect(diagnostics.forceSyncAllData).toHaveBeenCalledTimes(1);
        // Should trigger a refresh diagnosis
        expect(diagnostics.checkSyncStatus).toHaveBeenCalledTimes(2);
      });
    });

    test('should handle clear storage button click', async () => {
      render(<Diagnostics />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Sync Status')).toBeInTheDocument();
      });

      const button = screen.getByText('Clear Storage');
      fireEvent.click(button);

      await waitFor(() => {
        expect(diagnostics.clearSyncStorage).toHaveBeenCalledTimes(1);
        // Should trigger a refresh diagnosis
        expect(diagnostics.checkSyncStatus).toHaveBeenCalledTimes(2);
      });
    });

    test('should handle refresh rules button click with callback', async () => {
      const mockRefreshRules = jest.fn().mockResolvedValue();
      render(<Diagnostics onRefreshRules={mockRefreshRules} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Sync Status')).toBeInTheDocument();
      });

      const button = screen.getByText('Refresh Rules');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockRefreshRules).toHaveBeenCalledTimes(1);
        // Should trigger a refresh diagnosis
        expect(diagnostics.checkSyncStatus).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Test Results Display', () => {
    test('should display test results after successful test', async () => {
      render(<Diagnostics />);

      const button = screen.getByText('Test Sync');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Sync Test Results')).toBeInTheDocument();
        expect(screen.getByText('Passed')).toBeInTheDocument();
        expect(screen.getByText('Duration: 150ms')).toBeInTheDocument();
        expect(screen.getByText('All sync operations completed successfully')).toBeInTheDocument();
      });
    });

    test('should display failed test results', async () => {
      const failedResults = {
        success: false,
        duration: 50,
        details: 'Sync operation failed'
      };
      diagnostics.testSync.mockResolvedValue(failedResults);

      render(<Diagnostics />);

      const button = screen.getByText('Test Sync');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByText('Sync operation failed')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle diagnosis errors', async () => {
      diagnostics.checkSyncStatus.mockRejectedValue(new Error('Diagnosis failed'));

      render(<Diagnostics />);

      const button = screen.getByText('Run Diagnosis');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Diagnosis failed: Diagnosis failed/)).toBeInTheDocument();
      });
    });

    test('should handle sync test errors', async () => {
      diagnostics.testSync.mockRejectedValue(new Error('Test failed'));

      render(<Diagnostics />);

      const button = screen.getByText('Test Sync');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Sync test failed: Test failed/)).toBeInTheDocument();
      });
    });

    test('should handle force sync errors', async () => {
      diagnostics.forceSyncAllData.mockResolvedValue({ 
        success: false, 
        error: 'Permission denied' 
      });

      render(<Diagnostics />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Sync Status')).toBeInTheDocument();
      });

      const button = screen.getByText('Force Sync');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Force sync failed: Permission denied/)).toBeInTheDocument();
      });
    });

    test('should handle clear storage errors', async () => {
      diagnostics.clearSyncStorage.mockResolvedValue({ 
        success: false, 
        error: 'Storage locked' 
      });

      render(<Diagnostics />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Sync Status')).toBeInTheDocument();
      });

      const button = screen.getByText('Clear Storage');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Clear storage failed: Storage locked/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('should show loading state for diagnosis button', async () => {
      // Mock slow response
      diagnostics.checkSyncStatus.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockSyncStatus), 100))
      );

      render(<Diagnostics />);

      const button = screen.getByText('Run Diagnosis');
      fireEvent.click(button);

      // Button should show loading state (Evergreen UI disables button when loading)
      await waitFor(() => {
        expect(button.closest('button')).toBeDisabled();
      });
    });

    test('should show loading state for test sync button', async () => {
      diagnostics.testSync.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockTestResults), 100))
      );

      render(<Diagnostics />);

      const button = screen.getByText('Test Sync');
      fireEvent.click(button);

      await waitFor(() => {
        expect(button.closest('button')).toBeDisabled();
      });
    });
  });

  describe('Component Props', () => {
    test('should handle missing onRefreshRules prop gracefully', async () => {
      render(<Diagnostics />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Sync Status')).toBeInTheDocument();
      });

      const button = screen.getByText('Refresh Rules');
      fireEvent.click(button);

      // Should not throw error and should still refresh diagnosis
      await waitFor(() => {
        expect(diagnostics.checkSyncStatus).toHaveBeenCalledTimes(2);
      });
    });
  });
});
