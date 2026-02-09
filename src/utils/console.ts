/**
 * Console output utilities with colored formatting
 */

import chalk from 'chalk';
import ora, { Ora } from 'ora';

/** Spinner instance for progress indication */
let spinner: Ora | null = null;

/**
 * Print a header
 */
export function header(text: string): void {
    console.log();
    console.log(chalk.bold.cyan('═'.repeat(60)));
    console.log(chalk.bold.cyan(`  ${text}`));
    console.log(chalk.bold.cyan('═'.repeat(60)));
    console.log();
}

/**
 * Print a section header
 */
export function section(text: string): void {
    console.log();
    console.log(chalk.bold.white(`▶ ${text}`));
    console.log(chalk.dim('─'.repeat(40)));
}

/**
 * Print an info message
 */
export function info(text: string): void {
    console.log(chalk.blue('ℹ'), text);
}

/**
 * Print a success message
 */
export function success(text: string): void {
    console.log(chalk.green('✔'), text);
}

/**
 * Print a warning message
 */
export function warning(text: string): void {
    console.log(chalk.yellow('⚠'), text);
}

/**
 * Print an error message
 */
export function error(text: string): void {
    console.log(chalk.red('✖'), text);
}

/**
 * Print a working-on announcement
 */
export function workingOn(text: string): void {
    console.log();
    console.log(chalk.magenta('🔧'), chalk.bold.magenta(text));
}

/**
 * Print a checkpoint marker
 */
export function checkpoint(stepLabel: string): void {
    console.log();
    console.log(chalk.yellow('━'.repeat(50)));
    console.log(chalk.yellow.bold(`  📍 CHECKPOINT: ${stepLabel}`));
    console.log(chalk.yellow('━'.repeat(50)));
    console.log();
}

/**
 * Print generated content with a label
 */
export function content(label: string, text: string): void {
    console.log();
    console.log(chalk.dim(`── ${label} ──`));
    console.log(text);
    console.log(chalk.dim('──'.repeat(20)));
}

/**
 * Print a progress indicator
 */
export function progress(current: number, total: number, label: string): void {
    const percentage = Math.round((current / total) * 100);
    const filled = Math.round(percentage / 5);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    console.log(chalk.dim(`[${bar}] ${percentage}% - ${label}`));
}

/**
 * Start a spinner for long-running operations
 */
export function startSpinner(text: string): void {
    spinner = ora({
        text,
        color: 'cyan',
    }).start();
}

/**
 * Update spinner text
 */
export function updateSpinner(text: string): void {
    if (spinner) {
        spinner.text = text;
    }
}

/**
 * Stop spinner with success
 */
export function spinnerSuccess(text?: string): void {
    if (spinner) {
        spinner.succeed(text);
        spinner = null;
    }
}

/**
 * Stop spinner with failure
 */
export function spinnerFail(text?: string): void {
    if (spinner) {
        spinner.fail(text);
        spinner = null;
    }
}

/**
 * Print document status table
 */
export function documentStatus(
    name: string,
    approved: boolean,
    hash?: string
): void {
    const status = approved ? chalk.green('✔ Approved') : chalk.yellow('○ Pending');
    const hashText = hash ? chalk.dim(` (${hash.substring(0, 8)}...)`) : '';
    console.log(`  ${chalk.bold(name.padEnd(12))} ${status}${hashText}`);
}

/**
 * Print a divider
 */
export function divider(): void {
    console.log(chalk.dim('─'.repeat(50)));
}

/**
 * Print a blank line
 */
export function blank(): void {
    console.log();
}
