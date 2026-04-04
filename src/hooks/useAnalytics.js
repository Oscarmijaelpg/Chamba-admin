/**
 * React hook for analytics
 * Provides easy access to analytics functions in components
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  trackPageView,
  trackEvent,
  trackUserAction,
  trackError,
  PerformanceMonitor,
} from '../lib/analytics';

/**
 * Hook to track page views on route changes
 */
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    // Track page view on route change
    const pageName = location.pathname.replace(/\//g, '_');
    trackPageView(location.pathname, pageName);
  }, [location]);
};

/**
 * Hook to track component render performance
 */
export const useComponentTracking = (componentName) => {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const renderTime = performance.now() - startTime;

      trackEvent('component_render', {
        component: componentName,
        duration: Math.round(renderTime),
      });
    };
  }, [componentName]);
};

/**
 * Hook to track user interactions
 */
export const useInteractionTracking = () => {
  return {
    trackClick: (element, details = {}) => {
      trackUserAction('click', element, details);
    },
    trackSubmit: (form, details = {}) => {
      trackUserAction('submit', form, details);
    },
    trackInput: (field, details = {}) => {
      trackUserAction('input', field, details);
    },
    trackNavigation: (destination, details = {}) => {
      trackUserAction('navigate', destination, details);
    },
  };
};

/**
 * Hook for measuring async operations
 */
export const usePerformanceMeasure = () => {
  return {
    start: (label) => PerformanceMonitor.start(label),
    end: (label) => PerformanceMonitor.end(label),
    measure: (label, fn) => PerformanceMonitor.measureAsync(label, fn),
  };
};

/**
 * Hook for error tracking
 */
export const useErrorTracking = () => {
  return {
    trackError: (error, context = {}) => {
      trackError(error, {
        ...context,
        timestamp: new Date().toISOString(),
      });
    },
  };
};

/**
 * Custom hook combining all analytics functionality
 */
export const useAnalytics = () => {
  return {
    trackEvent,
    trackUserAction,
    trackError,
    trackPageView,
    measure: (label, fn) => PerformanceMonitor.measureAsync(label, fn),
  };
};

export default useAnalytics;
