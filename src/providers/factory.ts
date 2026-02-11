/**
 * Provider factory
 * Creates LLM providers based on configuration
 */

import type { LLMProvider, ProviderConfig } from './types.js';
import { createOpenAIProvider } from './openai.js';
import { createMockProvider } from './mock.js';
import { createGeminiProvider } from './gemini.js';

/** Supported provider names */
export type ProviderName = 'openai' | 'mock' | 'gemini';

/**
 * Get the configured provider name from environment
 */
export function getProviderName(): ProviderName {
    const envProvider = process.env.DOCFORGE_PROVIDER?.toLowerCase();

    if (envProvider === 'mock') {
        return 'mock';
    }

    if (envProvider === 'gemini') {
        return 'gemini';
    }

    // Default to OpenAI
    return 'openai';
}

/**
 * Create a provider instance
 */
export function createProvider(
    name?: ProviderName,
    config?: ProviderConfig
): LLMProvider {
    const providerName = name ?? getProviderName();

    switch (providerName) {
        case 'mock':
            return createMockProvider();
        case 'gemini':
            return createGeminiProvider(config);
        case 'openai':
        default:
            return createOpenAIProvider(config);
    }
}

/**
 * Get a configured and ready provider
 * Throws an error with instructions if not configured
 */
export function getProvider(
    name?: ProviderName,
    config?: ProviderConfig
): LLMProvider {
    const provider = createProvider(name, config);

    if (!provider.isConfigured()) {
        throw new Error(
            `Provider "${provider.name}" is not configured.\n\n${provider.getConfigInstructions()}`
        );
    }

    return provider;
}

/**
 * Check if a provider is available and configured
 */
export function isProviderAvailable(name?: ProviderName): boolean {
    try {
        const provider = createProvider(name);
        return provider.isConfigured();
    } catch {
        return false;
    }
}
