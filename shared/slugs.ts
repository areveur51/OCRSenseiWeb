/**
 * Utility functions for generating URL-safe slugs
 */

/**
 * Generates a URL-safe slug from a string
 * Converts to lowercase, removes special chars, replaces spaces with hyphens
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-')     // Replace spaces with hyphens
    .replace(/-+/g, '-')      // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generates a unique slug by appending a numeric suffix if needed
 * Used when checking for uniqueness in database
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug;
  let counter = 1;
  
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

/**
 * Generates a short random suffix for additional uniqueness
 */
export function generateSlugWithSuffix(text: string, length: number = 6): string {
  const baseSlug = generateSlug(text);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  
  for (let i = 0; i < length; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return `${baseSlug}-${suffix}`;
}

/**
 * Validates if a string is a valid slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
