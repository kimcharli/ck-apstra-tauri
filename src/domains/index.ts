// Domain Exports
// Central export point for all business domains

export * from './excel';
export * from './apstra';
export * from './conversion';
export * from './provisioning';
export * from './shared';

// Domain constants for reference
export const DOMAINS = {
  EXCEL: 'excel',
  APSTRA: 'apstra',
  CONVERSION: 'conversion',
  PROVISIONING: 'provisioning',
  SHARED: 'shared',
} as const;

export type DomainType = typeof DOMAINS[keyof typeof DOMAINS];