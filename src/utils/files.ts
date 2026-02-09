/**
 * File system utilities
 */

import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';

/**
 * Ensure a directory exists
 */
export async function ensureDir(dirPath: string): Promise<void> {
    await mkdir(dirPath, { recursive: true });
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Read a file, returning null if it doesn't exist
 */
export async function readFileSafe(filePath: string): Promise<string | null> {
    try {
        return await readFile(filePath, 'utf-8');
    } catch {
        return null;
    }
}

/**
 * Write a file, creating parent directories if needed
 */
export async function writeFileSafe(
    filePath: string,
    content: string
): Promise<void> {
    await ensureDir(dirname(filePath));
    await writeFile(filePath, content, 'utf-8');
}

/**
 * Get the docs directory path
 */
export function getDocsDir(cwd: string = process.cwd()): string {
    return join(cwd, 'docs');
}

/**
 * Get the prompts directory path
 */
export function getPromptsDir(cwd: string = process.cwd()): string {
    return join(cwd, 'prompts');
}

/**
 * Get a document file path
 */
export function getDocPath(
    docType: 'rfc' | 'plan' | 'rollout',
    cwd: string = process.cwd()
): string {
    const filenames: Record<string, string> = {
        rfc: 'RFC.md',
        plan: 'PLAN.md',
        rollout: 'ROLLOUT.md',
    };
    return join(getDocsDir(cwd), filenames[docType]);
}

/**
 * Get a stage prompt file path
 */
export function getStagePromptPath(
    stageNumber: number,
    cwd: string = process.cwd()
): string {
    const paddedNumber = String(stageNumber).padStart(2, '0');
    return join(getPromptsDir(cwd), `Stage-${paddedNumber}.md`);
}
