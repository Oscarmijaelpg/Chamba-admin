/**
 * Analytics and Performance Monitoring
 * Integrations with Sentry, Google Analytics, and Web Vitals
 */

/**
 * Initialize Sentry for error tracking
 */
export const initSentry = () => {
  if (typeof window === 'undefined') return;

  const environment = import.meta.env.VITE_ENV || 'development';
  const enableSentry = import.meta.env.VITE_ENABLE_SENTRY !== 'false';

  if (!enableSentry) return;

  // Lazy load Sentry
  import('@sentry/react').then(({ init, setUser }) => {
    init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: environment,
      tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });

    // Set user context if authenticated
    const userId = localStorage.getItem('user_id');
    if (userId) {
      setUser({ id: userId });
    }
  });
};

/**
 * Initialize Google Analytics
 */
export const initGoogleAnalytics = () => {
  if (typeof window === 'undefined') return;

  const gaId = import.meta.env.VITE_GA_ID;
  if (!gaId) return;

  // Load Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', gaId, {
    page_path: window.location.pathname,
  });
};

/**
 * Initialize Web Vitals monitoring
 */
export const initWebVitals = () => {
  if (typeof window === 'undefined') return;

  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(onWebVitalMetric);
    getFID(onWebVitalMetric);
    getFCP(onWebVitalMetric);
    getLCP(onWebVitalMetric);
    getTTFB(onWebVitalMetric);
  });
};

/**
 * Handle Web Vitals metrics
 */
function onWebVitalMetric(metric) {
  // Send to analytics
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Log to console in development
  if (import.meta.env.VITE_ENV === 'development') {
    console.log(`${metric.name}:`, metric.value);
  }
}

/**
 * Track page view
 */
export const trackPageView = (path, title) => {
  if (window.gtag) {
    window.gtag('config', import.meta.env.VITE_GA_ID, {
      page_path: path,
      page_title: title,
    });
  }
};

/**
 * Track event
 */
export const trackEvent = (eventName, eventData = {}) => {
  if (window.gtag) {
    window.gtag('event', eventName, eventData);
  }

  // Also log to console in development
  if (import.meta.env.VITE_ENV === 'development') {
    console.log(`Event: ${eventName}`, eventData);
  }
};

/**
 * Track user action
 */
export const trackUserAction = (action, resource, details = {}) => {
  trackEvent(`user_${action}`, {
    resource,
    timestamp: new Date().toISOString(),
    ...details,
  });
};

/**
 * Track API call
 */
export const trackApiCall = (method, endpoint, statusCode, duration) => {
  trackEvent('api_call', {
    method,
    endpoint,
    status: statusCode,
    duration: Math.round(duration),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Track error
 */
export const trackError = (error, context = {}) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context,
  };

  // Send to Sentry
  if (import.meta.meta.env.VITE_ENABLE_SENTRY !== 'false') {
    import('@sentry/react').then(({ captureException }) => {
      captureException(error, { contexts: { custom: context } });
    });
  }

  // Send to Google Analytics
  trackEvent('error', errorData);

  // Log to console
  console.error('Tracked Error:', errorData);
};

/**
 * Initialize all analytics
 */
export const initializeAnalytics = () => {
  initSentry();
  initGoogleAnalytics();
  initWebVitals();
};

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  static measures = new Map();

  static start(label) {
    this.measures.set(label, performance.now());
  }

  static end(label) {
    if (!this.measures.has(label)) {
      console.warn(`Performance measure "${label}" not started`);
      return;
    }

    const start = this.measures.get(label);
    const duration = performance.now() - start;
    this.measures.delete(label);

    trackEvent('performance', {
      measure: label,
      duration: Math.round(duration),
    });

    return duration;
  }

  static async measureAsync(label, fn) {
    this.start(label);
    try {
      return await fn();
    } finally {
      this.end(label);
    }
  }
}

/**
 * User session tracking
 */
export const trackSessionStart = () => {
  const sessionId = generateSessionId();
  sessionStorage.setItem('session_id', sessionId);

  trackEvent('session_start', {
    session_id: sessionId,
    timestamp: new Date().toISOString(),
  });

  return sessionId;
};

export const trackSessionEnd = () => {
  const sessionId = sessionStorage.getItem('session_id');

  trackEvent('session_end', {
    session_id: sessionId,
    timestamp: new Date().toISOString(),
  });

  sessionStorage.removeItem('session_id');
};

/**
 * Generate unique session ID
 */
function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default {
  initializeAnalytics,
  trackPageView,
  trackEvent,
  trackUserAction,
  trackApiCall,
  trackError,
  trackSessionStart,
  trackSessionEnd,
  PerformanceMonitor,
};
