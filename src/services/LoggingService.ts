export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  category: 'NAVIGATION' | 'BUTTON_CLICK' | 'WORKFLOW' | 'DATA_CHANGE' | 'API_CALL' | 'ERROR' | 'SYSTEM';
  action: string;
  details?: any;
  userId?: string;
  sessionId?: string;
}

class LoggingService {
  private logs: LogEntry[] = [];
  private sessionId: string;
  private maxLogSize: number = 10000; // Maximum number of log entries

  constructor() {
    this.sessionId = this.generateSessionId();
    this.logInfo('SYSTEM', 'Logging service initialized', { sessionId: this.sessionId });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createLogEntry(
    level: LogEntry['level'],
    category: LogEntry['category'],
    action: string,
    details?: any
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      category,
      action,
      details,
      sessionId: this.sessionId
    };
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep logs within size limit
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }

    // Also log to console for debugging
    const logMessage = `[${entry.timestamp}] ${entry.category}:${entry.level} - ${entry.action}`;
    switch (entry.level) {
      case 'ERROR':
        console.error(logMessage, entry.details);
        break;
      case 'WARN':
        console.warn(logMessage, entry.details);
        break;
      case 'DEBUG':
        console.debug(logMessage, entry.details);
        break;
      default:
        console.log(logMessage, entry.details);
    }
  }

  // General logging methods
  logInfo(category: LogEntry['category'], action: string, details?: any): void {
    this.addLog(this.createLogEntry('INFO', category, action, details));
  }

  logWarn(category: LogEntry['category'], action: string, details?: any): void {
    this.addLog(this.createLogEntry('WARN', category, action, details));
  }

  logError(category: LogEntry['category'], action: string, details?: any): void {
    this.addLog(this.createLogEntry('ERROR', category, action, details));
  }

  logDebug(category: LogEntry['category'], action: string, details?: any): void {
    this.addLog(this.createLogEntry('DEBUG', category, action, details));
  }

  // Specific logging methods for common scenarios
  logButtonClick(buttonName: string, context: string, additionalData?: any): void {
    this.logInfo('BUTTON_CLICK', `Button clicked: ${buttonName}`, {
      context,
      buttonName,
      ...additionalData
    });
  }

  logNavigation(fromPage: string, toPage: string, trigger: string = 'button'): void {
    this.logInfo('NAVIGATION', `Navigation: ${fromPage} -> ${toPage}`, {
      fromPage,
      toPage,
      trigger,
      url: window.location.href
    });
  }

  logWorkflowStart(workflowName: string, initialData?: any): void {
    this.logInfo('WORKFLOW', `Workflow started: ${workflowName}`, {
      workflowName,
      step: 1,
      initialData
    });
  }

  logWorkflowStep(workflowName: string, stepNumber: number, stepName: string, data?: any): void {
    this.logInfo('WORKFLOW', `Workflow step: ${workflowName} - Step ${stepNumber}: ${stepName}`, {
      workflowName,
      stepNumber,
      stepName,
      data
    });
  }

  logWorkflowComplete(workflowName: string, result: any): void {
    this.logInfo('WORKFLOW', `Workflow completed: ${workflowName}`, {
      workflowName,
      result,
      completedAt: new Date().toISOString()
    });
  }

  logDataChange(dataType: string, operation: string, oldValue?: any, newValue?: any): void {
    this.logInfo('DATA_CHANGE', `Data changed: ${dataType} - ${operation}`, {
      dataType,
      operation,
      oldValue,
      newValue,
      changeId: Date.now()
    });
  }

  logApiCall(endpoint: string, method: string, params?: any, duration?: number): void {
    this.logInfo('API_CALL', `API call: ${method} ${endpoint}`, {
      endpoint,
      method,
      params,
      duration
    });
  }

  logApiError(endpoint: string, method: string, error: any, params?: any): void {
    this.logError('API_CALL', `API error: ${method} ${endpoint}`, {
      endpoint,
      method,
      error: error.toString(),
      params
    });
  }

  logFileOperation(operation: string, fileName: string, fileSize?: number, details?: any): void {
    this.logInfo('SYSTEM', `File operation: ${operation} - ${fileName}`, {
      operation,
      fileName,
      fileSize,
      details
    });
  }

  // Log retrieval and export methods
  getAllLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByCategory(category: LogEntry['category']): LogEntry[] {
    return this.logs.filter(log => log.category === category);
  }

  getLogsByLevel(level: LogEntry['level']): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getLogsByTimeRange(startTime: Date, endTime: Date): LogEntry[] {
    return this.logs.filter(log => {
      const logTime = new Date(log.timestamp);
      return logTime >= startTime && logTime <= endTime;
    });
  }

  exportLogsAsJson(): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      sessionId: this.sessionId,
      totalLogs: this.logs.length,
      logs: this.logs
    };
    return JSON.stringify(exportData, null, 2);
  }

  exportLogsAsCsv(): string {
    const headers = ['timestamp', 'level', 'category', 'action', 'details', 'sessionId'];
    const csvRows = [headers.join(',')];

    this.logs.forEach(log => {
      const row = [
        `"${log.timestamp}"`,
        log.level,
        log.category,
        `"${log.action}"`,
        `"${JSON.stringify(log.details || {}).replace(/"/g, '""')}"`,
        log.sessionId || ''
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  exportLogsAsText(): string {
    const header = `=== Apstra Provisioning Tool - Session Log ===
Session ID: ${this.sessionId}
Export Time: ${new Date().toISOString()}
Total Entries: ${this.logs.length}
${'='.repeat(50)}

`;

    const logEntries = this.logs.map(log => {
      const detailsStr = log.details ? `\n  Details: ${JSON.stringify(log.details, null, 2)}` : '';
      return `[${log.timestamp}] ${log.level} | ${log.category} | ${log.action}${detailsStr}`;
    }).join('\n\n');

    return header + logEntries;
  }

  clearLogs(): void {
    const clearedCount = this.logs.length;
    this.logs = [];
    this.logInfo('SYSTEM', 'Logs cleared', { clearedCount });
  }

  getLogStats(): any {
    const stats = {
      totalLogs: this.logs.length,
      sessionId: this.sessionId,
      categories: {} as Record<string, number>,
      levels: {} as Record<string, number>,
      timeRange: {
        oldest: this.logs.length > 0 ? this.logs[0].timestamp : null,
        newest: this.logs.length > 0 ? this.logs[this.logs.length - 1].timestamp : null
      }
    };

    this.logs.forEach(log => {
      stats.categories[log.category] = (stats.categories[log.category] || 0) + 1;
      stats.levels[log.level] = (stats.levels[log.level] || 0) + 1;
    });

    return stats;
  }
}

// Export singleton instance
export const logger = new LoggingService();