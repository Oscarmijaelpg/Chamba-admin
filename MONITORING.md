# Performance Monitoring and Analytics Guide

This guide covers setting up performance monitoring and analytics for the Chamba Admin Panel.

## Overview

The Chamba Admin Panel includes integrations with:
- **Sentry**: Error tracking and performance monitoring
- **Google Analytics**: User behavior and traffic analytics
- **Web Vitals**: Core Web Vitals metrics
- **Custom Performance Monitoring**: Built-in performance measurement

## Setup

### 1. Sentry Configuration

#### Create Sentry Project

1. Go to [sentry.io](https://sentry.io)
2. Create a new project (select React)
3. Copy your DSN

#### Add to Environment

Create `admin/.env.monitoring`:

```
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
VITE_ENABLE_SENTRY=true
VITE_ENV=staging
```

#### Initialize in App

```javascript
import { initializeAnalytics } from './lib/analytics';

// In App.jsx or main.jsx
useEffect(() => {
  initializeAnalytics();
}, []);
```

### 2. Google Analytics Configuration

#### Create GA4 Property

1. Go to [Google Analytics](https://analytics.google.com)
2. Create a new GA4 property
3. Copy your Measurement ID (G-XXXXXXXXXX)

#### Add to Environment

```env
VITE_GA_ID=G-XXXXXXXXXX
```

#### Verify Installation

1. Open browser DevTools
2. Go to Network tab
3. Filter by "gtag"
4. Perform an action and verify request sent to Google Analytics

### 3. Web Vitals Monitoring

#### Core Web Vitals Tracked

- **CLS** (Cumulative Layout Shift): Visual stability
- **FID** (First Input Delay): Responsiveness
- **FCP** (First Contentful Paint): Loading performance
- **LCP** (Largest Contentful Paint): Perceived load speed
- **TTFB** (Time to First Byte): Server response time

#### View Metrics

Metrics are automatically sent to:
- Google Analytics (Real-time dashboard)
- Sentry (Performance tab)
- Browser console (in development)

### 4. Custom Performance Monitoring

#### Measure Component Performance

```javascript
import { useComponentTracking } from './hooks/useAnalytics';

export function MyComponent() {
  useComponentTracking('MyComponent');
  
  return <div>Component content</div>;
}
```

#### Measure Async Operations

```javascript
import { PerformanceMonitor } from './lib/analytics';

const result = await PerformanceMonitor.measureAsync('api-fetch', async () => {
  return await fetchData();
});
```

#### Track User Actions

```javascript
import { useInteractionTracking } from './hooks/useAnalytics';

export function LoginForm() {
  const { trackSubmit } = useInteractionTracking();
  
  const handleSubmit = (e) => {
    trackSubmit('login-form', { method: 'email' });
    // Handle form submission
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### Track API Calls

```javascript
import { trackApiCall } from './lib/analytics';

async function fetchData() {
  const startTime = performance.now();
  
  try {
    const response = await fetch('/api/data');
    const duration = performance.now() - startTime;
    
    trackApiCall('GET', '/api/data', response.status, duration);
    return response.json();
  } catch (error) {
    const duration = performance.now() - startTime;
    trackApiCall('GET', '/api/data', error.status || 0, duration);
    throw error;
  }
}
```

## Monitoring Dashboards

### Google Analytics

**Real-time Monitoring**
- Path: Home → Real-time
- View current active users, page views, events

**User Behavior**
- Path: Reports → User Engagement
- Track session duration, bounce rate, user flow

**Core Web Vitals**
- Path: Reports → Performance
- View Web Vitals metrics and thresholds

### Sentry

**Error Tracking**
- View error details, stack traces, affected users
- Automatic grouping of similar errors

**Performance Monitoring**
- View Web Vitals metrics
- Track transaction performance
- Identify performance regressions

**Session Replays**
- View user sessions with screen recordings
- Reproduce issues and understand user behavior

## Metrics to Track

### Performance Metrics

```javascript
// Automatic Web Vitals
- CLS (Cumulative Layout Shift)
- FID (First Input Delay)
- FCP (First Contentful Paint)
- LCP (Largest Contentful Paint)
- TTFB (Time to First Byte)

// Custom Metrics
- Component render time
- API response time
- Page load time
- User interaction latency
```

### User Engagement Metrics

```javascript
// Tracked Automatically
- Session duration
- Bounce rate
- Page views
- User flow

// Custom Events
- Form submissions
- Feature usage
- Error occurrences
- User actions
```

### Business Metrics

```javascript
// Define Based on Goals
- User registration
- Feature adoption
- User retention
- Conversion rates
```

## Alerts and Thresholds

### Performance Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 |
| FID | < 100ms | 100 - 300ms | > 300ms |
| LCP | < 2.5s | 2.5 - 4s | > 4s |
| TTFB | < 600ms | 600 - 1200ms | > 1200ms |

### Set Sentry Alerts

1. Go to Sentry project settings
2. Alerts → Create alert
3. Set condition (e.g., "Error rate > 5%")
4. Configure notification (email, Slack, etc.)

### Set Google Analytics Alerts

1. Go to GA4 property
2. Admin → Custom alerts
3. Configure alert conditions and recipients

## Debugging

### Enable Debug Mode

```env
VITE_DEBUG=true
VITE_DEBUG_ANALYTICS=true
```

### View Performance Timeline

```javascript
// In browser console
performance.getEntriesByType('navigation');
performance.getEntriesByType('paint');
performance.getEntriesByType('measure');
```

### Test Error Tracking

```javascript
import { trackError } from './lib/analytics';

// This will send to Sentry and GA
trackError(new Error('Test error'), { context: 'test' });
```

## Privacy and GDPR Compliance

### Google Analytics Privacy

- Anonymize IP: Enabled by default
- Respect user consent (cookie banner)
- Configure data retention: 14-50 months

### Sentry Privacy

- Enable Session Replay consent
- Mask sensitive data in error reports
- Configure data retention policies

### Implementation

```javascript
// Request user consent before tracking
function requestAnalyticsConsent() {
  const consent = confirm('Allow analytics tracking?');
  
  if (consent) {
    initializeAnalytics();
  } else {
    console.log('Analytics tracking declined');
  }
}
```

## Integration Examples

### Login Form with Tracking

```javascript
import { useInteractionTracking } from './hooks/useAnalytics';
import { trackUserAction, trackError } from './lib/analytics';

export function LoginForm() {
  const { trackSubmit } = useInteractionTracking();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (email, password) => {
    trackSubmit('login-form');
    setLoading(true);

    try {
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (response.error) {
        trackError(response.error, { form: 'login' });
        setError(response.error.message);
      } else {
        trackUserAction('login_success', 'auth');
      }
    } catch (error) {
      trackError(error, { form: 'login' });
    } finally {
      setLoading(false);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### API Call with Tracking

```javascript
import { trackApiCall, trackError } from './lib/analytics';

export async function apiCall(endpoint, options = {}) {
  const startTime = performance.now();

  try {
    const response = await fetch(endpoint, {
      headers: { 'Authorization': `Bearer ${getToken()}` },
      ...options,
    });

    const duration = performance.now() - startTime;
    trackApiCall(options.method || 'GET', endpoint, response.status, duration);

    return response.json();
  } catch (error) {
    const duration = performance.now() - startTime;
    trackApiCall(options.method || 'GET', endpoint, 0, duration);
    trackError(error, { endpoint });
    throw error;
  }
}
```

## Performance Optimization

### Identify Bottlenecks

1. Open Sentry dashboard
2. Go to Performance section
3. Identify slow transactions
4. View flamegraph to see where time is spent

### Optimize Web Vitals

#### Improve CLS (Cumulative Layout Shift)
- Specify image dimensions
- Avoid inserting content above existing content
- Use CSS transform for animations

#### Improve FID (First Input Delay)
- Break up long tasks
- Use Web Workers for heavy computation
- Implement code splitting

#### Improve LCP (Largest Contentful Paint)
- Optimize images
- Use CDN for static assets
- Lazy load non-critical content
- Implement service worker caching

## Continuous Monitoring

### Weekly Review

- Check error rate trends
- Review performance metrics
- Identify user pain points
- Plan optimizations

### Monthly Analysis

- Compare metrics month-over-month
- Analyze feature adoption
- Review user feedback
- Prioritize improvements

## Troubleshooting

### Sentry Not Receiving Errors

- Verify DSN in environment variables
- Check browser console for Sentry script errors
- Enable Sentry debug mode: `init({ debug: true })`

### Google Analytics Not Tracking

- Verify GA ID in environment variables
- Check Network tab for gtag requests
- Disable ad blockers during testing
- Clear browser cache

### Web Vitals Not Displaying

- Ensure page has sufficient content
- Check that metrics are being sent (Network tab)
- Web Vitals require real user data, not synthetic

## Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Google Analytics 4](https://support.google.com/analytics)
- [Web Vitals](https://web.dev/vitals/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)

## Next Steps

1. Set up Sentry project and DSN
2. Set up Google Analytics property
3. Add environment variables
4. Initialize analytics in App.jsx
5. Test with sample events
6. Configure alerts
7. Review dashboards weekly
