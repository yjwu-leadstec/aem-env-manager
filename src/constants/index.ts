/**
 * AEM Environment Manager Constants
 * Centralized configuration values for the application
 */

// ============================================
// AEM Instance Defaults
// ============================================

export const INSTANCE_DEFAULTS = {
  /** Default port for AEM Author instance */
  AUTHOR_PORT: 4502,
  /** Default port for AEM Publish instance */
  PUBLISH_PORT: 4503,
  /** Default host for local development */
  HOST: 'localhost',
  /** Default run modes for new instances */
  RUN_MODES: [] as string[],
} as const;

// ============================================
// Timing Constants (in milliseconds)
// ============================================

export const TIMING = {
  /** Delay before refreshing instance status after start/stop */
  STATUS_REFRESH_DELAY: 2000,
  /** Default notification display duration */
  NOTIFICATION_DURATION: 5000,
  /** Health check polling interval */
  HEALTH_CHECK_INTERVAL: 30000,
  /** Quick action feedback duration */
  QUICK_ACTION_FEEDBACK: 2000,
  /** Default status check interval in milliseconds (5 seconds) */
  STATUS_CHECK_INTERVAL: 5000,
  /** Minimum status check interval in seconds */
  STATUS_CHECK_INTERVAL_MIN: 1,
} as const;

// ============================================
// UI Constants
// ============================================

export const UI = {
  /** Maximum number of recent profiles to track */
  MAX_RECENT_PROFILES: 5,
  /** Sidebar width in pixels */
  SIDEBAR_WIDTH: 264,
} as const;

// ============================================
// AEM Quick Links
// ============================================

export const AEM_QUICK_LINKS = [
  { label: 'CRXDE Lite', path: '/crx/de/index.jsp', icon: '⚡' },
  { label: 'Package Manager', path: '/crx/packmgr/index.jsp', icon: '📦' },
  { label: 'Bundles', path: '/system/console/bundles', icon: '🔧' },
  { label: 'Logs', path: '/system/console/slinglog', icon: '📋' },
  { label: 'Sites Console', path: '/sites.html/content', icon: '🌐' },
] as const;

// ============================================
// Validation Rules
// ============================================

export const VALIDATION = {
  /** Minimum port number */
  PORT_MIN: 1,
  /** Maximum port number */
  PORT_MAX: 65535,
  /** Minimum profile name length */
  PROFILE_NAME_MIN_LENGTH: 2,
} as const;
