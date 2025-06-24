import React, { Component, Fragment } from 'react';
import {
  Pane,
  Heading,
  Text,
  Button,
  Badge,
  Paragraph,
  TickCircleIcon,
  CrossIcon,
  RefreshIcon,
  TrashIcon,
  UploadIcon,
  ImportIcon,
  PlayIcon,
  Alert,
  Card,
  majorScale,
} from 'evergreen-ui';
import { translate } from 'helpers/i18n';
import { diagnostics } from 'helpers/syncDiagnostics';

/**
 * Diagnostics Component - Single Responsibility: Sync Diagnostics UI
 * 
 * Clean Code Principles Applied:
 * - SRP: Only handles diagnostic UI and interactions
 * - DRY: Reusable StatusCard and ActionButton components
 * - Descriptive naming: Clear method and variable names
 * - Small functions: Each method has one responsibility
 */
export class Diagnostics extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      diagnosticResults: null,
      testResults: null,
      forceSyncResult: null,
      clearStorageResult: null,
      refreshRulesResult: null,
      isRunningDiagnosis: false,
      isTestingSync: false,
      isForcingSync: false,
      isClearingStorage: false,
      isRefreshingRules: false,
      error: null,
    };
  }

  componentDidMount() {
    this._isMounted = true;
    this.runInitialDiagnosis();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  // Single responsibility: Initialize diagnostic check
  runInitialDiagnosis = async () => {
    await this.runDiagnosis();
  };

  // Single responsibility: Execute diagnostic checks
  runDiagnosis = async () => {
    if (!this._isMounted) return;
    this.setState({ isRunningDiagnosis: true, error: null });
    
    try {
      const results = await diagnostics.checkSyncStatus();
      const problems = await diagnostics.diagnoseProblems();
      
      if (this._isMounted) {
        this.setState({
          diagnosticResults: { ...results, problems },
          isRunningDiagnosis: false,
        });
      }
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          error: `Diagnosis failed: ${error.message}`,
          isRunningDiagnosis: false,
        });
      }
    }
  };

  // Single responsibility: Test sync functionality
  testSyncFunctionality = async () => {
    if (!this._isMounted) return;
    this.setState({ isTestingSync: true, error: null });
    
    try {
      const testResults = await diagnostics.testSync();
      if (this._isMounted) {
        this.setState({
          testResults,
          isTestingSync: false,
        });
      }
    } catch (error) {
      if (this._isMounted) {
        this.setState({
          error: `Sync test failed: ${error.message}`,
          isTestingSync: false,
        });
      }
    }
  };

  // Single responsibility: Force sync all data
  forceSyncAllData = async () => {
    this.setState({ isForcingSync: true, error: null });
    
    try {
      const result = await diagnostics.forceSyncAllData();
      if (result.success) {
        // Show success feedback and refresh diagnostics
        this.setState({ 
          forceSyncResult: {
            success: true,
            message: 'All local data has been successfully synced to cloud storage.',
            timestamp: new Date().toLocaleTimeString()
          }
        });
        await this.runDiagnosis(); // Refresh diagnostics
      } else {
        throw new Error(result.error || 'Force sync failed');
      }
    } catch (error) {
      this.setState({
        error: `Force sync failed: ${error.message}`,
        forceSyncResult: {
          success: false,
          message: error.message,
          timestamp: new Date().toLocaleTimeString()
        }
      });
    } finally {
      this.setState({ isForcingSync: false });
    }
  };

  // Single responsibility: Clear sync storage
  clearSyncStorage = async () => {
    this.setState({ isClearingStorage: true, error: null });
    
    try {
      const result = await diagnostics.clearSyncStorage();
      if (result.success) {
        // Show success feedback and refresh diagnostics
        this.setState({ 
          clearStorageResult: {
            success: true,
            message: 'Sync storage has been completely cleared.',
            timestamp: new Date().toLocaleTimeString()
          }
        });
        await this.runDiagnosis(); // Refresh diagnostics
      } else {
        throw new Error(result.error || 'Clear storage failed');
      }
    } catch (error) {
      this.setState({
        error: `Clear storage failed: ${error.message}`,
        clearStorageResult: {
          success: false,
          message: error.message,
          timestamp: new Date().toLocaleTimeString()
        }
      });
    } finally {
      this.setState({ isClearingStorage: false });
    }
  };

  // Single responsibility: Refresh rules from cloud
  refreshRulesFromCloud = async () => {
    this.setState({ isRefreshingRules: true, error: null });
    
    try {
      // This would call the existing refresh method from parent
      if (this.props.onRefreshRules) {
        await this.props.onRefreshRules();
      }
      
      // Show success feedback and refresh diagnostics
      this.setState({ 
        refreshRulesResult: {
          success: true,
          message: 'Successfully refreshed rules from cloud storage.',
          timestamp: new Date().toLocaleTimeString()
        }
      });
      await this.runDiagnosis(); // Refresh diagnostics
    } catch (error) {
      this.setState({
        error: `Refresh rules failed: ${error.message}`,
        refreshRulesResult: {
          success: false,
          message: error.message,
          timestamp: new Date().toLocaleTimeString()
        }
      });
    } finally {
      this.setState({ isRefreshingRules: false });
    }
  };

  // DRY: Reusable status indicator component
  renderStatusIndicator = (isAvailable, label) => (
    <Pane display="flex" alignItems="center" marginY={majorScale(1)}>
      {isAvailable ? (
        <TickCircleIcon color="success" marginRight={majorScale(1)} />
      ) : (
        <CrossIcon color="danger" marginRight={majorScale(1)} />
      )}
      <Text>{label}</Text>
      <Badge 
        color={isAvailable ? "green" : "red"} 
        marginLeft={majorScale(1)}
      >
        {isAvailable ? 'Available' : 'Unavailable'}
      </Badge>
    </Pane>
  );

  // DRY: Reusable action button component
  renderActionButton = ({ 
    icon, 
    text, 
    intent = "default", 
    isLoading, 
    onClick 
  }) => (
    <Button
      height={32}
      iconBefore={icon}
      intent={intent}
      marginRight={majorScale(1)}
      marginBottom={majorScale(1)}
      isLoading={isLoading}
      onClick={onClick}
    >
      {text}
    </Button>
  );

  // DRY: Reusable info card component
  renderInfoCard = ({ title, children, intent = "none" }) => (
    <Card
      elevation={1}
      background={intent !== "none" ? `${intent}Tint` : "tint1"}
      padding={majorScale(2)}
      marginBottom={majorScale(2)}
    >
      <Heading size={500} marginBottom={majorScale(1)}>{title}</Heading>
      {children}
    </Card>
  );

  // Single responsibility: Render sync status overview
  renderSyncStatus = () => {
    const { diagnosticResults } = this.state;
    
    if (!diagnosticResults) return null;

    return this.renderInfoCard({
      title: translate('syncStatus') || 'Sync Status',
      children: (
        <Fragment>
          {this.renderStatusIndicator(
            diagnosticResults.syncAvailable,
            translate('syncAvailable') || 'Sync Available'
          )}
          
          <Pane marginY={majorScale(1)}>
            <Text>
              {translate('browser') || 'Browser'}: {' '}
              <Badge color="blue">
                {diagnosticResults.browser 
                  ? diagnosticResults.browser.split(' ').slice(0, 3).join(' ')
                  : translate('unknown') || 'Unknown'}
              </Badge>
            </Text>
          </Pane>

          <Pane marginY={majorScale(1)}>
            <Text>
              {translate('storageUsed') || 'Storage Used'}: {' '}
              {diagnosticResults.storageUsed !== null 
                ? `${(diagnosticResults.storageUsed / 1024).toFixed(2)} KB`
                : translate('unknown') || 'Unknown'}
            </Text>
          </Pane>

          <Pane marginY={majorScale(1)}>
            <Text>
              {translate('syncedItems') || 'Synced Items'}: {' '}
              {diagnosticResults.syncableSettingsFound?.length || 0}
              {diagnosticResults.missingSettings?.length > 0 && 
                ` (${diagnosticResults.missingSettings.length} missing)`}
            </Text>
          </Pane>

          {diagnosticResults.errors?.length > 0 && (
            <Alert
              intent="danger"
              title={`${diagnosticResults.errors.length} Error(s) Detected`}
              marginTop={majorScale(1)}
            >
              {diagnosticResults.errors.map((error, index) => (
                <Text key={index} size={300} fontFamily="mono">
                  {error.location}: {error.message}
                </Text>
              ))}
            </Alert>
          )}
        </Fragment>
      )
    });
  };

  // Single responsibility: Render test results
  renderTestResults = () => {
    const { testResults } = this.state;
    
    if (!testResults) return null;

    return this.renderInfoCard({
      title: 'Sync Test Results',
      intent: testResults.success ? "success" : "danger",
      children: (
        <Fragment>
          <Pane marginY={majorScale(1)}>
            <Text>
              Status: {' '}
              <Badge color={testResults.success ? "green" : "red"}>
                {testResults.success ? 'Passed' : 'Failed'}
              </Badge>
            </Text>
          </Pane>

          {/* Show test duration if available */}
          {testResults.duration && (
            <Pane marginY={majorScale(1)}>
              <Text>Duration: {testResults.duration}ms</Text>
            </Pane>
          )}

          {/* Show test start/end times if available */}
          {testResults.startTime && (
            <Pane marginY={majorScale(1)}>
              <Text size={300} color="muted">
                Started: {new Date(testResults.startTime).toLocaleTimeString()}
              </Text>
            </Pane>
          )}

          {/* Display test steps for transparency (Clean Code: expressive output) */}
          {testResults.steps && testResults.steps.length > 0 && (
            <Pane marginY={majorScale(2)}>
              <Text fontWeight="bold" marginBottom={majorScale(1)}>
                Test Steps:
              </Text>
              {testResults.steps.map((step, index) => (
                <Pane 
                  key={index} 
                  display="flex" 
                  alignItems="flex-start" 
                  marginBottom={majorScale(1)}
                >
                  <Badge 
                    color={step.includes('✓') ? 'green' : step.includes('❌') ? 'red' : 'blue'} 
                    marginRight={majorScale(1)} 
                    marginTop={2}
                  >
                    {index + 1}
                  </Badge>
                  <Text size={300} flex="1" fontFamily="mono">{step}</Text>
                </Pane>
              ))}
            </Pane>
          )}

          {/* Display errors if test failed */}
          {testResults.errors && testResults.errors.length > 0 && (
            <Pane marginY={majorScale(2)}>
              <Text fontWeight="bold" marginBottom={majorScale(1)} color="danger">
                Errors:
              </Text>
              {testResults.errors.map((error, index) => (
                <Pane 
                  key={index} 
                  display="flex" 
                  alignItems="flex-start" 
                  marginBottom={majorScale(1)}
                >
                  <Badge color="red" marginRight={majorScale(1)} marginTop={2}>
                    !
                  </Badge>
                  <Text size={300} flex="1" color="danger">{error}</Text>
                </Pane>
              ))}
            </Pane>
          )}

          {/* Generic details fallback */}
          {testResults.details && !testResults.steps && (
            <Pane marginY={majorScale(1)}>
              <Text size={300} fontFamily="mono">
                {testResults.details}
              </Text>
            </Pane>
          )}
        </Fragment>
      )
    });
  };

  // Single responsibility: Render problem diagnosis results
  renderProblemDiagnosis = () => {
    const { diagnosticResults } = this.state;
    
    if (!diagnosticResults?.problems) return null;

    const { problems, suggestions, overallHealth } = diagnosticResults.problems;
    
    // Determine intent based on overall health (Clean Code: expressive naming)
    const getHealthIntent = (health) => {
      switch (health) {
        case 'good': return 'success';
        case 'fair': return 'warning';
        case 'poor': return 'danger';
        default: return 'none';
      }
    };

    return this.renderInfoCard({
      title: translate('problemDiagnosis') || 'Problem Diagnosis',
      intent: getHealthIntent(overallHealth),
      children: (
        <Fragment>
          <Pane marginY={majorScale(1)}>
            <Text>
              {translate('overallHealth') || 'Overall Health'}: {' '}
              <Badge 
                color={overallHealth === 'good' ? 'green' : overallHealth === 'fair' ? 'orange' : 'red'}
              >
                {overallHealth?.toUpperCase() || 'UNKNOWN'}
              </Badge>
            </Text>
          </Pane>

          <Pane marginY={majorScale(1)}>
            <Text>
              {translate('problemsFound') || 'Problems Found'}: {' '}
              <Badge color={problems?.length > 0 ? 'red' : 'green'}>
                {problems?.length || 0}
              </Badge>
            </Text>
          </Pane>

          {/* Display problems if any exist (Clean Code: Guard clauses) */}
          {problems && problems.length > 0 && (
            <Pane marginY={majorScale(2)}>
              <Text fontWeight="bold" marginBottom={majorScale(1)}>
                {translate('issuesDetected') || 'Issues Detected'}:
              </Text>
              {problems.map((problem, index) => (
                <Pane 
                  key={index} 
                  display="flex" 
                  alignItems="flex-start" 
                  marginBottom={majorScale(1)}
                >
                  <Badge color="red" marginRight={majorScale(1)} marginTop={2}>
                    !
                  </Badge>
                  <Text size={300} flex="1">{problem}</Text>
                </Pane>
              ))}
            </Pane>
          )}

          {/* Display suggestions if any exist (DRY: similar structure to problems) */}
          {suggestions && suggestions.length > 0 && (
            <Pane marginY={majorScale(2)}>
              <Text fontWeight="bold" marginBottom={majorScale(1)}>
                {translate('recommendations') || 'Recommendations'}:
              </Text>
              {suggestions.map((suggestion, index) => (
                <Pane 
                  key={index} 
                  display="flex" 
                  alignItems="flex-start" 
                  marginBottom={majorScale(1)}
                >
                  <Badge color="blue" marginRight={majorScale(1)} marginTop={2}>
                    i
                  </Badge>
                  <Text size={300} flex="1">{suggestion}</Text>
                </Pane>
              ))}
            </Pane>
          )}

          {/* Show success message when no problems found */}
          {(!problems || problems.length === 0) && (
            <Pane marginY={majorScale(2)}>
              <Pane display="flex" alignItems="center">
                <TickCircleIcon color="success" marginRight={majorScale(1)} />
                <Text color="success" fontWeight="bold">
                  {translate('noProblemFound') || 'No problems detected! Your sync is healthy.'}
                </Text>
              </Pane>
            </Pane>
          )}
        </Fragment>
      )
    });
  };

  // Single responsibility: Render action results (DRY: reusable for different actions)
  renderActionResult = (resultKey, actionName) => {
    const result = this.state[resultKey];
    
    if (!result) return null;

    return this.renderInfoCard({
      title: `${actionName} Result`,
      intent: result.success ? "success" : "danger",
      children: (
        <Fragment>
          <Pane marginY={majorScale(1)}>
            <Text>
              Status: {' '}
              <Badge color={result.success ? "green" : "red"}>
                {result.success ? 'Success' : 'Failed'}
              </Badge>
            </Text>
          </Pane>

          <Pane marginY={majorScale(1)}>
            <Text>{result.message}</Text>
          </Pane>

          <Pane marginY={majorScale(1)}>
            <Text size={300} color="muted">
              Completed at: {result.timestamp}
            </Text>
          </Pane>
        </Fragment>
      )
    });
  };

  // Single responsibility: Render force sync results
  renderForceSyncResult = () => {
    return this.renderActionResult('forceSyncResult', 'Force Sync');
  };

  // Single responsibility: Render clear storage results
  renderClearStorageResult = () => {
    return this.renderActionResult('clearStorageResult', 'Clear Storage');
  };

  // Single responsibility: Render refresh rules results
  renderRefreshRulesResult = () => {
    return this.renderActionResult('refreshRulesResult', 'Refresh Rules');
  };

  // Single responsibility: Render all action results (DRY: consolidates result displays)
  renderActionResults = () => {
    return (
      <Fragment>
        {this.renderForceSyncResult()}
        {this.renderClearStorageResult()}
        {this.renderRefreshRulesResult()}
      </Fragment>
    );
  };

  // Single responsibility: Render all action results
  renderActionResults = () => (
    <Fragment>
      {this.renderForceSyncResult()}
      {this.renderClearStorageResult()}
    </Fragment>
  );

  // Single responsibility: Render action buttons
  renderActionButtons = () => (
    <Pane marginBottom={majorScale(3)}>
      {this.renderActionButton({
        icon: RefreshIcon,
        text: translate('runDiagnosis') || 'Run Diagnosis',
        isLoading: this.state.isRunningDiagnosis,
        onClick: this.runDiagnosis,
      })}

      {this.renderActionButton({
        icon: PlayIcon,
        text: translate('testSync') || 'Test Sync',
        intent: "primary",
        isLoading: this.state.isTestingSync,
        onClick: this.testSyncFunctionality,
      })}

      {this.renderActionButton({
        icon: UploadIcon,
        text: translate('forceSyncSettings') || 'Force Sync',
        intent: "success",
        isLoading: this.state.isForcingSync,
        onClick: this.forceSyncAllData,
      })}

      {this.renderActionButton({
        icon: ImportIcon,
        text: translate('refreshRulesFromCloud') || 'Refresh Rules',
        intent: "success",
        isLoading: this.state.isRefreshingRules,
        onClick: this.refreshRulesFromCloud,
      })}

      {this.renderActionButton({
        icon: TrashIcon,
        text: translate('clearSyncStorage') || 'Clear Storage',
        intent: "danger",
        isLoading: this.state.isClearingStorage,
        onClick: this.clearSyncStorage,
      })}
    </Pane>
  );

  render() {
    const { error } = this.state;

    return (
      <Fragment>
        <Paragraph size={400} marginBottom={majorScale(2)}>
          {translate('syncDiagnosticsDescription') || 
           'Diagnose and troubleshoot sync functionality between devices.'}
        </Paragraph>

        {error && (
          <Alert
            intent="danger"
            title="Error"
            marginBottom={majorScale(2)}
          >
            {error}
          </Alert>
        )}

        {this.renderActionButtons()}
        {this.renderSyncStatus()}
        {this.renderTestResults()}
        {this.renderProblemDiagnosis()}
        {this.renderActionResults()}
      </Fragment>
    );
  }
}

export default Diagnostics;
