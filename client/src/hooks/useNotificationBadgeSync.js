// Custom hook to sync notification badges with FCM push notifications
import { useEffect, useCallback } from 'react';
import notificationService from '../services/notificationService';

/**
 * Hook to trigger badge refresh when FCM notifications arrive
 * This ensures badges update in real-time even when triggered by backend
 * 
 * @param {Function} onNotificationReceived - Callback when notification arrives
 * @returns {Object} - Badge refresh controls
 */
export const useNotificationBadgeSync = (onNotificationReceived) => {
  const handleForegroundMessage = useCallback((payload) => {
    console.log('🔔 Badge sync: FCM notification received', payload);
    
    // Extract notification type and data
    const notificationType = payload.data?.type;
    const organizationId = payload.data?.organizationId;
    
    // Trigger badge refresh callback
    if (onNotificationReceived) {
      onNotificationReceived({
        type: notificationType,
        organizationId,
        payload
      });
    }
    
    // Log for debugging
    console.log('📊 Badge should refresh for:', {
      type: notificationType,
      org: organizationId
    });
  }, [onNotificationReceived]);

  useEffect(() => {
    // Listen for foreground FCM messages
    const unsubscribe = notificationService.onForegroundMessage(handleForegroundMessage);
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [handleForegroundMessage]);

  return {
    // Expose methods for manual refresh if needed
    refreshBadges: () => {
      console.log('🔄 Manual badge refresh triggered');
      // Could emit custom event here if needed
      window.dispatchEvent(new CustomEvent('refreshNotificationBadges'));
    }
  };
};

/**
 * Hook to listen for badge refresh events
 * Use this in badge components to force refresh on demand
 * 
 * @param {Function} onRefresh - Callback to execute on refresh
 */
export const useBadgeRefreshListener = (onRefresh) => {
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 Badge refresh event received');
      if (onRefresh) {
        onRefresh();
      }
    };

    window.addEventListener('refreshNotificationBadges', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshNotificationBadges', handleRefresh);
    };
  }, [onRefresh]);
};

/**
 * Hook to get real-time notification counts across all organizations
 * Useful for app-wide badge display
 * 
 * @param {String} userId - Current user ID
 * @returns {Object} - Notification counts by type
 */
export const useGlobalNotificationCounts = (userId) => {
  // This could be expanded to provide aggregated counts
  // For now, it's a placeholder for future enhancement
  return {
    total: 0,
    byType: {
      chat: 0,
      announcements: 0,
      bills: 0,
      documents: 0,
      payments: 0
    }
  };
};

export default useNotificationBadgeSync;
