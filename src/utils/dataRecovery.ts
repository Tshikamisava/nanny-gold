// Advanced data recovery and state management utilities
import { UserPreferences } from '@/types/booking';

export interface RecoveryResult {
  preferences?: Partial<UserPreferences>;
  selectedNanny?: any;
  recoveredFrom: string[];
  timestamp: number;
}

// Comprehensive data recovery from multiple sources
export const performDataRecovery = (): RecoveryResult => {
  const recoveredFrom: string[] = [];
  let preferences: Partial<UserPreferences> = {};
  let selectedNanny: any = null;
  
  console.log('🔧 Performing comprehensive data recovery...');
  
  // 1. Recover from localStorage
  try {
    const savedPrefs = localStorage.getItem('bookingPreferences');
    if (savedPrefs) {
      const parsed = JSON.parse(savedPrefs);
      preferences = { ...preferences, ...parsed };
      recoveredFrom.push('localStorage-preferences');
      console.log('✅ Recovered preferences from localStorage');
    }
    
    const savedNanny = localStorage.getItem('selectedNanny');
    if (savedNanny) {
      const parsed = JSON.parse(savedNanny);
      // Check if data is recent (within 24 hours)
      if (parsed.timestamp && (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000) {
        selectedNanny = parsed;
        recoveredFrom.push('localStorage-nanny');
        console.log('✅ Recovered nanny from localStorage');
      }
    }
  } catch (error) {
    console.error('❌ Error recovering from localStorage:', error);
  }
  
  // 2. Recover from sessionStorage
  try {
    const sessionPrefs = sessionStorage.getItem('tempBookingData');
    if (sessionPrefs) {
      const parsed = JSON.parse(sessionPrefs);
      preferences = { ...preferences, ...parsed };
      recoveredFrom.push('sessionStorage');
      console.log('✅ Recovered data from sessionStorage');
    }
  } catch (error) {
    console.error('❌ Error recovering from sessionStorage:', error);
  }
  
  // 3. Recover from URL parameters
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlData: Partial<UserPreferences> = {};
    
    if (urlParams.get('type')) {
      urlData.bookingSubType = urlParams.get('type') as any;
      recoveredFrom.push('url-type');
    }
    
    if (urlParams.get('duration')) {
      urlData.durationType = urlParams.get('duration') as any;
      recoveredFrom.push('url-duration');
    }
    
    if (urlParams.get('arrangement')) {
      urlData.livingArrangement = urlParams.get('arrangement');
      recoveredFrom.push('url-arrangement');
    }
    
    if (Object.keys(urlData).length > 0) {
      preferences = { ...preferences, ...urlData };
      console.log('✅ Recovered data from URL parameters');
    }
  } catch (error) {
    console.error('❌ Error recovering from URL:', error);
  }
  
  // 4. Infer from current route
  try {
    const pathname = window.location.pathname;
    const routeData: Partial<UserPreferences> = {};
    
    if (pathname.includes('living-arrangement')) {
      routeData.durationType = 'long_term';
      recoveredFrom.push('route-inference');
    }
    
    if (pathname.includes('schedule-builder')) {
      if (!preferences.durationType) {
        routeData.durationType = 'short_term';
        recoveredFrom.push('route-inference');
      }
    }
    
    if (Object.keys(routeData).length > 0) {
      preferences = { ...preferences, ...routeData };
      console.log('✅ Inferred data from current route');
    }
  } catch (error) {
    console.error('❌ Error inferring from route:', error);
  }
  
  const result: RecoveryResult = {
    preferences,
    selectedNanny,
    recoveredFrom,
    timestamp: Date.now()
  };
  
  console.log('🔧 Data recovery completed:', {
    recoveredSources: recoveredFrom,
    hasPreferences: Object.keys(preferences).length > 0,
    hasNanny: !!selectedNanny
  });
  
  return result;
};

// Persist data to multiple storage mechanisms for redundancy
export const persistDataRedundantly = (preferences: UserPreferences, selectedNanny?: any) => {
  const timestamp = Date.now();
  
  try {
    // 1. localStorage (primary)
    localStorage.setItem('bookingPreferences', JSON.stringify(preferences));
    localStorage.setItem('lastDataBackup', timestamp.toString());
    
    if (selectedNanny) {
      localStorage.setItem('selectedNanny', JSON.stringify({
        ...selectedNanny,
        timestamp
      }));
    }
    
    // 2. sessionStorage (secondary)
    sessionStorage.setItem('tempBookingData', JSON.stringify(preferences));
    
    // 3. Store booking flow context
    if (preferences.durationType === 'long_term' || preferences.livingArrangement) {
      localStorage.setItem('bookingFlow', 'long-term');
    } else if (preferences.bookingSubType) {
      localStorage.setItem('bookingFlow', 'short-term');
    }
    
    console.log('💾 Data persisted redundantly across multiple storage mechanisms');
  } catch (error) {
    console.error('❌ Error persisting data redundantly:', error);
  }
};

// Clean old data to prevent storage bloat
export const cleanupOldData = () => {
  try {
    const lastBackup = localStorage.getItem('lastDataBackup');
    if (lastBackup) {
      const backupTime = parseInt(lastBackup);
      const dayOld = Date.now() - (24 * 60 * 60 * 1000);
      
      if (backupTime < dayOld) {
        localStorage.removeItem('selectedNanny');
        sessionStorage.removeItem('tempBookingData');
        console.log('🗑️ Cleaned up old data from storage');
      }
    }
  } catch (error) {
    console.error('❌ Error cleaning up old data:', error);
  }
};

// Validate data integrity after recovery
export const validateRecoveredData = (data: Partial<UserPreferences>) => {
  const issues: string[] = [];
  
  // Check for data consistency
  if (data.durationType === 'long_term' && !data.livingArrangement) {
    issues.push('Long-term booking missing living arrangement');
  }
  
  if (data.livingArrangement && !data.homeSize) {
    issues.push('Living arrangement specified but home size missing');
  }
  
  if (data.bookingSubType && data.durationType === 'long_term') {
    issues.push('Conflicting booking type and duration');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};