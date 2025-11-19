// Comprehensive debugging utility for persistent issues

interface DebugLog {
  timestamp: string;
  component: string;
  action: string;
  data: any;
  success?: boolean;
  error?: string;
}

class DebugLogger {
  private logs: DebugLog[] = [];
  private maxLogs = 100;

  log(component: string, action: string, data: any, success?: boolean, error?: string) {
    const logEntry: DebugLog = {
      timestamp: new Date().toISOString(),
      component,
      action,
      data: this.sanitizeData(data),
      success,
      error
    };
    
    this.logs.push(logEntry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Console log for immediate debugging
    const prefix = success === false ? '❌' : success === true ? '✅' : '🔍';
    console.log(`${prefix} [${component}] ${action}:`, data, error ? `Error: ${error}` : '');
  }

  logRouting(from: string, to: string, userId?: string, userRole?: string, success = true) {
    this.log('ROUTING', 'navigate', {
      from,
      to,
      userId: userId ? `${userId.substring(0, 8)}...` : 'none',
      userRole
    }, success);
  }

  logPreferences(action: 'save' | 'load', data: any, success: boolean, error?: string) {
    this.log('PREFERENCES', action, {
      dataKeys: Object.keys(data || {}),
      dataSize: JSON.stringify(data || {}).length,
      hasChildren: !!(data?.childrenAges?.length > 0),
      hasCooking: !!data?.cooking,
      hasSchedule: !!data?.schedule
    }, success, error);
  }

  logAuth(action: string, data: any, success: boolean, error?: string) {
    this.log('AUTH', action, {
      userId: data?.user?.id ? `${data.user.id.substring(0, 8)}...` : 'none',
      userType: data?.user?.user_metadata?.user_type || 'unknown',
      hasSession: !!data?.session
    }, success, error);
  }

  logDatabase(table: string, action: string, success: boolean, error?: string, recordCount?: number) {
    this.log('DATABASE', `${table}_${action}`, {
      recordCount
    }, success, error);
  }

  getLogs(component?: string): DebugLog[] {
    if (component) {
      return this.logs.filter(log => log.component === component);
    }
    return [...this.logs];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
    console.log('🧹 Debug logs cleared');
  }

  private sanitizeData(data: any): any {
    if (!data) return data;
    
    // Create a safe copy without sensitive data
    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'apikey', 'secret'];
    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    // Limit large objects
    if (typeof sanitized === 'object') {
      const str = JSON.stringify(sanitized);
      if (str.length > 1000) {
        return { ...sanitized, _truncated: `Original size: ${str.length} chars` };
      }
    }
    
    return sanitized;
  }
}

// Export singleton instance
export const debugLogger = new DebugLogger();

// Utility functions for common logging patterns
export const logRouting = (from: string, to: string, userId?: string, userRole?: string, success = true) => {
  debugLogger.logRouting(from, to, userId, userRole, success);
};

export const logPreferences = (action: 'save' | 'load', data: any, success: boolean, error?: string) => {
  debugLogger.logPreferences(action, data, success, error);
};

export const logAuth = (action: string, data: any, success: boolean, error?: string) => {
  debugLogger.logAuth(action, data, success, error);
};

export const logDatabase = (table: string, action: string, success: boolean, error?: string, recordCount?: number) => {
  debugLogger.logDatabase(table, action, success, error, recordCount);
};

// Debug panel for development
export const showDebugPanel = () => {
  if (typeof window !== 'undefined') {
    console.group('🐛 NannyGold Debug Logs');
    console.table(debugLogger.getLogs());
    console.groupEnd();
  }
};

// Add to window for easy access in browser console
if (typeof window !== 'undefined') {
  (window as any).nannyGoldDebug = {
    logs: () => debugLogger.getLogs(),
    routing: () => debugLogger.getLogs('ROUTING'),
    preferences: () => debugLogger.getLogs('PREFERENCES'),
    auth: () => debugLogger.getLogs('AUTH'),
    clear: () => debugLogger.clearLogs(),
    export: () => debugLogger.exportLogs(),
    show: showDebugPanel
  };
}
