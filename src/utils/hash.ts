/**
 * Hash utility for content integrity verification
 */

import { createHash } from 'crypto';

/**
 * Calculate SHA-256 hash of content
 */
export function calculateHash(content: string): string {
    return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Calculate hash of a file's content
 */
export function calculateContentHash(content: string): string {
    // Normalize line endings before hashing
    const normalized = content.replace(/\r\n/g, '\n').trim();
    return calculateHash(normalized);
}

/**
 * Compare two content strings by hash
 */
export function contentEquals(content1: string, content2: string): boolean {
    return calculateContentHash(content1) === calculateContentHash(content2);
}
