import React, { Component } from 'react';
import {
  Pane,
  Button,
  Paragraph,
  toaster,
  Card,
  Heading,
  Badge,
  Table,
  Text,
  Spinner,
  Alert,
  RefreshIcon,
  CleanIcon,
  SettingsIcon,
  UploadIcon,
  DownloadIcon
} from 'evergreen-ui';
import { diagnostics } from 'helpers/syncDiagnostics';
import { translate } from 'helpers/i18n';

/**
 * Diagnostics component for sync and storage health monitoring
 * Follows Single Responsibility Principle - only handles diagnostics UI
 */
export default class Diagnostics extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      isLoading: false,
      diagnosticsData: null,
      lastUpdated: null,
      cleanupResults: null,
      optimizationResults: null
    };
  }

  componentDidMount() {
    this.runDiagnostics();
  }

  /**
   * Run comprehensive diagnostics check
   * Follows Single Responsibility Principle - only handles diagnostics execution
   */
  runDiagnostics = async () => {
    this.setState({ isLoading: true });
    
    try {
      const results = await diagnostics.checkSyncStatus();
      this.setState({
        diagnosticsData: results,
        lastUpdated: new Date().toLocaleString(),
        isLoading: false
      });
    } catch (error) {
      console.error('Diagnostics failed:', error);
      toaster.danger('Failed to run diagnostics: ' + error.message);
      this.setState({ isLoading: false });
    }
  };

  /**
   * Clean up duplicate settings
   * Follows Single Responsibility Principle - only handles cleanup UI coordination
   */
  cleanupDuplicates = async () => {
    this.setState({ isLoading: true });
    
    try {
      const results = await diagnostics.cleanupDuplicateSettings();
      this.setState({
        cleanupResults: results,
        isLoading: false
      });
      
      if (results.success) {
        toaster.success('Cleanup completed successfully');
        // Refresh diagnostics after cleanup
        setTimeout(() => this.runDiagnostics(), 1000);
        
        // Refresh rules if callback provided (Open/Closed Principle)
        if (this.props.onRefreshRules) {
          this.props.onRefreshRules();
        }
      } else {
        toaster.warning('Cleanup completed with some issues');
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      toaster.danger('Failed to cleanup duplicates: ' + error.message);
      this.setState({ isLoading: false });
    }
  };

  /**
   * Analyze large arrays for optimization
   * Follows Single Responsibility Principle - only handles optimization UI
   */
  optimizeArrays = async () => {
    this.setState({ isLoading: true });
    
    try {
      const results = await diagnostics.optimizeLargeArrays();
      this.setState({
        optimizationResults: results,
        isLoading: false
      });
      
      toaster.success('Array analysis completed');
    } catch (error) {
      console.error('Optimization analysis failed:', error);
      toaster.danger('Failed to analyze arrays: ' + error.message);
      this.setState({ isLoading: false });
    }
  };

  /**
   * Force sync up (local to cloud)
   * Follows Single Responsibility Principle - only handles sync up UI logic
   */
  forceSyncUp = async () => {
    try {
      this.setState({ isLoading: true });
      const results = await diagnostics.forceSyncUp();
      
      if (results.success) {
        toaster.success(results.message || 'Successfully synced settings to cloud');
        this.runDiagnostics(); // Refresh diagnostics
      } else {
        toaster.danger(results.message || 'Failed to sync to cloud');
      }
    } catch (error) {
      console.error('Force sync up failed:', error);
      toaster.danger(`Failed to sync to cloud: ${error.message}`);
    } finally {
      this.setState({ isLoading: false });
    }
  };

  /**
   * Force sync down (cloud to local)
   * Follows Single Responsibility Principle - only handles sync down UI logic
   */
  forceSyncDown = async () => {
    try {
      this.setState({ isLoading: true });
      const results = await diagnostics.forceSyncDown();
      
      if (results.success) {
        toaster.success(results.message || 'Successfully synced settings from cloud');
        this.runDiagnostics(); // Refresh diagnostics
        
        // Notify parent component to refresh rules if callback is available
        if (this.props.onRefreshRules) {
          this.props.onRefreshRules();
        }
      } else {
        toaster.danger(results.message || 'Failed to sync from cloud');
      }
    } catch (error) {
      console.error('Force sync down failed:', error);
      toaster.danger(`Failed to sync from cloud: ${error.message}`);
    } finally {
      this.setState({ isLoading: false });
    }
  };

  /**
   * Render status badge based on health
   * Follows Single Responsibility Principle - only handles status visualization
   */
  renderStatusBadge = (status) => {
    const { syncAvailable, errors } = status || {};
    
    if (!syncAvailable) {
      return <Badge color="red">Sync Unavailable</Badge>;
    }
    
    if (errors && errors.length > 0) {
      return <Badge color="orange">Issues Found</Badge>;
    }
    
    return <Badge color="green">Healthy</Badge>;
  };

  /**
   * Render sync information table
   * Follows Single Responsibility Principle - only handles sync info display
   */
  renderSyncInfo = () => {
    const { diagnosticsData } = this.state;
    
    if (!diagnosticsData) return null;

    return (
      <Card elevation={1} padding={16} marginBottom={16}>
        <Heading size={600} marginBottom={12}>Sync Status</Heading>
        <Table>
          <Table.Body>
            <Table.Row>
              <Table.TextCell>Sync Available</Table.TextCell>
              <Table.TextCell>
                {diagnosticsData.syncAvailable ? '✓ Yes' : '❌ No'}
              </Table.TextCell>
            </Table.Row>
            <Table.Row>
              <Table.TextCell>Storage Quota</Table.TextCell>
              <Table.TextCell>
                {diagnosticsData.storageQuota ? 
                  `${diagnosticsData.storageUsed} / ${diagnosticsData.storageQuota} bytes` : 
                  'Unknown'
                }
              </Table.TextCell>
            </Table.Row>
            <Table.Row>
              <Table.TextCell>Sync Settings</Table.TextCell>
              <Table.TextCell>{diagnosticsData.syncableSettingsFound?.length || 0} found</Table.TextCell>
            </Table.Row>
            <Table.Row>
              <Table.TextCell>Local Settings</Table.TextCell>
              <Table.TextCell>{diagnosticsData.localOnlySettingsFound?.length || 0} found</Table.TextCell>
            </Table.Row>
            
            {/* Enhanced rule counts - separated by type for clarity */}
            <Table.Row>
              <Table.TextCell><strong>Cloud Rules</strong></Table.TextCell>
              <Table.TextCell>
                Deny-List: {diagnosticsData.syncRuleCounts?.blacklist || 0}, 
                Allow-List: {diagnosticsData.syncRuleCounts?.whitelist || 0}
              </Table.TextCell>
            </Table.Row>
            <Table.Row>
              <Table.TextCell><strong>Cloud Keywords</strong></Table.TextCell>
              <Table.TextCell>
                Deny Keywords: {diagnosticsData.syncRuleCounts?.blacklistKeywords || 0}, 
                Allow Keywords: {diagnosticsData.syncRuleCounts?.whitelistKeywords || 0}
              </Table.TextCell>
            </Table.Row>
            <Table.Row>
              <Table.TextCell><strong>Local Rules</strong></Table.TextCell>
              <Table.TextCell>
                Deny-List: {diagnosticsData.localRuleCounts?.blacklist || 0}, 
                Allow-List: {diagnosticsData.localRuleCounts?.whitelist || 0}
              </Table.TextCell>
            </Table.Row>
            <Table.Row>
              <Table.TextCell><strong>Local Keywords</strong></Table.TextCell>
              <Table.TextCell>
                Deny Keywords: {diagnosticsData.localRuleCounts?.blacklistKeywords || 0}, 
                Allow Keywords: {diagnosticsData.localRuleCounts?.whitelistKeywords || 0}
              </Table.TextCell>
            </Table.Row>
            
            {/* Sync metadata */}
            {(diagnosticsData.lastSyncInfo?.lastSyncUp || diagnosticsData.lastSyncInfo?.lastSyncDown) && (
              <Table.Row>
                <Table.TextCell><strong>Last Sync</strong></Table.TextCell>
                <Table.TextCell>
                  {diagnosticsData.lastSyncInfo.lastSyncUp && (
                    <div>↑ Up: {new Date(diagnosticsData.lastSyncInfo.lastSyncUp).toLocaleString()}</div>
                  )}
                  {diagnosticsData.lastSyncInfo.lastSyncDown && (
                    <div>↓ Down: {new Date(diagnosticsData.lastSyncInfo.lastSyncDown).toLocaleString()}</div>
                  )}
                </Table.TextCell>
              </Table.Row>
            )}
          </Table.Body>
        </Table>
      </Card>
    );
  };

  /**
   * Render cleanup results
   * Follows Single Responsibility Principle - only handles cleanup results display
   */
  renderCleanupResults = () => {
    const { cleanupResults } = this.state;
    
    if (!cleanupResults) return null;

    return (
      <Card elevation={1} padding={16} marginBottom={16}>
        <Heading size={600} marginBottom={12}>Cleanup Results</Heading>
        {cleanupResults.cleanedUp.map((item, index) => (
          <Paragraph key={index} color={cleanupResults.success ? 'success' : 'warning'}>
            ✓ {item}
          </Paragraph>
        ))}
        {cleanupResults.errors.map((error, index) => (
          <Paragraph key={index} color="danger">
            ❌ {error}
          </Paragraph>
        ))}
      </Card>
    );
  };

  /**
   * Render optimization results
   * Follows Single Responsibility Principle - only handles optimization display
   */
  renderOptimizationResults = () => {
    const { optimizationResults } = this.state;
    
    if (!optimizationResults) return null;

    return (
      <Card elevation={1} padding={16} marginBottom={16}>
        <Heading size={600} marginBottom={12}>Array Optimization Analysis</Heading>
        {optimizationResults.analyzed.map((analysis, index) => (
          <Card key={index} elevation={0} border padding={12} marginBottom={8}>
            <Text fontWeight={600}>{analysis.key}</Text>
            <Paragraph>
              Count: {analysis.count} | Size: {analysis.sizeBytes} bytes
              {analysis.duplicates && ` | Duplicates: ${analysis.duplicates}`}
            </Paragraph>
            <Paragraph color={analysis.priority === 'high' ? 'danger' : analysis.priority === 'medium' ? 'warning' : 'muted'}>
              {analysis.recommendation}
            </Paragraph>
          </Card>
        ))}
        {optimizationResults.potentialSavings > 0 && (
          <Alert intent="success" title={`Potential space savings: ${optimizationResults.potentialSavings} bytes`} />
        )}
      </Card>
    );
  };

  render() {
    const { isLoading, diagnosticsData, lastUpdated } = this.state;

    return (
      <Pane>
        <Pane display="flex" alignItems="center" marginBottom={16}>
          <Heading size={700} marginRight={16}>
            {translate('syncDiagnostics', 'Sync Diagnostics')}
          </Heading>
          {diagnosticsData && this.renderStatusBadge(diagnosticsData)}
        </Pane>

        {lastUpdated && (
          <Paragraph color="muted" marginBottom={16}>
            Last updated: {lastUpdated}
          </Paragraph>
        )}

        <Pane display="flex" gap={8} marginBottom={16} flexWrap="wrap">
          <Button
            iconBefore={RefreshIcon}
            onClick={this.runDiagnostics}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Running...' : 'Run Diagnostics'}
          </Button>
          
          <Button
            iconBefore={CleanIcon}
            onClick={this.cleanupDuplicates}
            disabled={isLoading}
            intent="warning"
          >
            Cleanup Duplicates
          </Button>
          
          <Button
            iconBefore={SettingsIcon}
            onClick={this.optimizeArrays}
            disabled={isLoading}
          >
            Analyze Arrays
          </Button>
          
          <Button
            iconBefore={UploadIcon}
            onClick={this.forceSyncUp}
            disabled={isLoading}
            intent="success"
          >
            Force Sync Up
          </Button>
          
          <Button
            iconBefore={DownloadIcon}
            onClick={this.forceSyncDown}
            disabled={isLoading}
            intent="success"
          >
            Force Sync Down
          </Button>
        </Pane>

        {isLoading && <Spinner marginX="auto" marginY={24} />}

        {this.renderSyncInfo()}
        {this.renderCleanupResults()}
        {this.renderOptimizationResults()}

        {diagnosticsData?.errors && diagnosticsData.errors.length > 0 && (
          <Card elevation={1} padding={16} background="redTint">
            <Heading size={600} marginBottom={12}>Errors</Heading>
            {diagnosticsData.errors.map((error, index) => (
              <Paragraph key={index} color="danger">
                ❌ {error.message || error}
              </Paragraph>
            ))}
          </Card>
        )}
      </Pane>
    );
  }
}