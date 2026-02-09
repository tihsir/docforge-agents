/**
 * LLM Provider type definitions
 */

import { z } from 'zod';

/** Message role */
export type MessageRole = 'system' | 'user' | 'assistant';

/** Chat message */
export interface LLMMessage {
    role: MessageRole;
    content: string;
}

/** Generation options */
export interface GenerateOptions {
    messages: LLMMessage[];
    temperature?: number;
    maxTokens?: number;
    /** JSON schema for structured output */
    jsonSchema?: z.ZodType<unknown>;
    /** System prompt (prepended to messages) */
    systemPrompt?: string;
}

/** Generation response */
export interface GenerateResponse {
    content: string;
    /** Parsed JSON if jsonSchema was provided */
    parsed?: unknown;
    /** Token usage info */
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

/** Provider configuration */
export interface ProviderConfig {
    apiKey?: string;
    model?: string;
    baseUrl?: string;
}

/**
 * LLM Provider interface
 * All providers must implement this interface
 */
export interface LLMProvider {
    /** Provider name for identification */
    readonly name: string;

    /** Generate a completion */
    generate(options: GenerateOptions): Promise<GenerateResponse>;

    /** Check if provider is configured and ready */
    isConfigured(): boolean;

    /** Get configuration instructions for the user */
    getConfigInstructions(): string;
}

/**
 * Provider factory function type
 */
export type ProviderFactory = (config?: ProviderConfig) => LLMProvider;
