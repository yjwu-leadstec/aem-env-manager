// AEM License Management API
// Tauri IPC bindings for AEM license management

import { invoke } from '@tauri-apps/api/core';

// ============================================
// Types
// ============================================

export type LicenseStatus = 'valid' | 'expired' | 'expiring' | 'invalid' | 'unknown';

export interface AemLicense {
  id: string;
  name: string;
  license_key: string | null;
  license_file_path: string | null;
  product_name: string;
  product_version: string | null;
  customer_name: string | null;
  expiry_date: string | null;
  status: LicenseStatus;
  associated_instance_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LicenseValidationResult {
  is_valid: boolean;
  status: LicenseStatus;
  days_until_expiry: number | null;
  message: string | null;
}

export interface LicenseStatistics {
  total: number;
  valid: number;
  expiring: number;
  expired: number;
  unknown: number;
}

export interface CreateLicenseInput {
  name: string;
  license_key?: string;
  license_file_path?: string;
  product_name: string;
  product_version?: string;
  customer_name?: string;
  expiry_date?: string;
  associated_instance_id?: string;
  notes?: string;
}

// ============================================
// License CRUD Operations
// ============================================

/**
 * List all AEM licenses
 */
export async function listAemLicenses(): Promise<AemLicense[]> {
  return invoke<AemLicense[]>('list_aem_licenses');
}

/**
 * Get a specific license by ID
 */
export async function getAemLicense(id: string): Promise<AemLicense | null> {
  return invoke<AemLicense | null>('get_aem_license', { id });
}

/**
 * Add a new AEM license
 */
export async function addAemLicense(license: CreateLicenseInput): Promise<AemLicense> {
  const licenseData: Partial<AemLicense> = {
    id: '',
    name: license.name,
    license_key: license.license_key || null,
    license_file_path: license.license_file_path || null,
    product_name: license.product_name,
    product_version: license.product_version || null,
    customer_name: license.customer_name || null,
    expiry_date: license.expiry_date || null,
    status: 'unknown',
    associated_instance_id: license.associated_instance_id || null,
    notes: license.notes || null,
    created_at: '',
    updated_at: '',
  };
  return invoke<AemLicense>('add_aem_license', { license: licenseData });
}

/**
 * Update an existing license
 */
export async function updateAemLicense(
  id: string,
  license: Partial<AemLicense>
): Promise<AemLicense> {
  return invoke<AemLicense>('update_aem_license', { id, license });
}

/**
 * Delete a license
 */
export async function deleteAemLicense(id: string): Promise<boolean> {
  return invoke<boolean>('delete_aem_license', { id });
}

// ============================================
// License Validation
// ============================================

/**
 * Validate a license
 */
export async function validateAemLicense(id: string): Promise<LicenseValidationResult> {
  return invoke<LicenseValidationResult>('validate_aem_license', { id });
}

/**
 * Check if license file exists
 */
export async function checkLicenseFile(path: string): Promise<boolean> {
  return invoke<boolean>('check_license_file', { path });
}

/**
 * Read license file content
 */
export async function readLicenseFile(path: string): Promise<string> {
  return invoke<string>('read_license_file', { path });
}

/**
 * Parsed license properties from a license.properties file
 */
export interface ParsedLicenseProperties {
  license_key: string | null;
  product_name: string | null;
  product_version: string | null;
  customer_name: string | null;
  expiry_date: string | null;
  download_id: string | null;
  raw_properties: Record<string, string>;
}

/**
 * Parse a license.properties file and extract license information
 * @param path - Path to the license.properties file
 */
export async function parseLicenseFile(path: string): Promise<ParsedLicenseProperties> {
  return invoke<ParsedLicenseProperties>('parse_license_file', { path });
}

// ============================================
// License Association
// ============================================

/**
 * Associate a license with an AEM instance
 */
export async function associateLicenseWithInstance(
  licenseId: string,
  instanceId: string
): Promise<AemLicense> {
  return invoke<AemLicense>('associate_license_with_instance', {
    licenseId,
    instanceId,
  });
}

/**
 * Get licenses for a specific instance
 */
export async function getLicensesForInstance(instanceId: string): Promise<AemLicense[]> {
  return invoke<AemLicense[]>('get_licenses_for_instance', { instanceId });
}

// ============================================
// License Statistics
// ============================================

/**
 * Get license statistics
 */
export async function getLicenseStatistics(): Promise<LicenseStatistics> {
  return invoke<LicenseStatistics>('get_license_statistics');
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get status badge color class
 */
export function getStatusColor(status: LicenseStatus): string {
  switch (status) {
    case 'valid':
      return 'badge-success';
    case 'expiring':
      return 'badge-warning';
    case 'expired':
      return 'badge-error';
    case 'invalid':
      return 'badge-error';
    case 'unknown':
    default:
      return 'badge-slate';
  }
}

/**
 * Format expiry date for display
 */
export function formatExpiryDate(date: string | null): string {
  if (!date) return 'No expiry date';

  try {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

/**
 * Calculate days until expiry
 */
export function getDaysUntilExpiry(date: string | null): number | null {
  if (!date) return null;

  try {
    const expiryDate = new Date(date);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}
