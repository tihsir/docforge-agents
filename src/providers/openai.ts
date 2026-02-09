/**
 * OpenAI Provider Implementation
 */

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import type {
    LLMProvider,
    GenerateOptions,
    GenerateResponse,
    ProviderConfig,
} from './types.js';

const DEFAULT_MODEL = 'gpt-4o';

/**
 * OpenAI-compatible LLM provider
 * Works with OpenAI API and compatible endpoints
 */
export class OpenAIProvider implements LLMProvider {
    readonly name = 'openai';
    private client: OpenAI | null = null;
    private model: string;
    private apiKey: string | undefined;

    constructor(config?: ProviderConfig) {
        this.apiKey = config?.apiKey ?? process.env.OPENAI_API_KEY;
        this.model = config?.model ?? process.env.OPENAI_MODEL ?? DEFAULT_MODEL;

        if (this.apiKey) {
            this.client = new OpenAI({
                apiKey: this.apiKey,
                baseURL: config?.baseUrl ?? process.env.OPENAI_BASE_URL,
            });
        }
    }

    isConfigured(): boolean {
        return this.client !== null;
    }

    getConfigInstructions(): string {
        return `To use the OpenAI provider, set the following environment variables:

  OPENAI_API_KEY=your-api-key-here

Optional:
  OPENAI_MODEL=gpt-4o (default: gpt-4o)
  OPENAI_BASE_URL=https://api.openai.com/v1 (for compatible APIs)

You can get an API key at: https://platform.openai.com/api-keys`;
    }

    async generate(options: GenerateOptions): Promise<GenerateResponse> {
        if (!this.client) {
            throw new Error('OpenAI provider not configured. ' + this.getConfigInstructions());
        }

        const messages: OpenAI.ChatCompletionMessageParam[] = [];

        // Add system prompt if provided
        if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
        }

        // Add conversation messages
        for (const msg of options.messages) {
            messages.push({
                role: msg.role as 'system' | 'user' | 'assistant',
                content: msg.content,
            });
        }

        // Handle structured output with JSON schema
        if (options.jsonSchema) {
            const completion = await this.client.beta.chat.completions.parse({
                model: this.model,
                messages,
                temperature: options.temperature ?? 0.7,
                max_tokens: options.maxTokens ?? 4096,
                response_format: zodResponseFormat(options.jsonSchema, 'response'),
            });

            const parsed = completion.choices[0]?.message?.parsed;
            const content = completion.choices[0]?.message?.content ?? '';

            return {
                content,
                parsed,
                usage: completion.usage
                    ? {
                        promptTokens: completion.usage.prompt_tokens,
                        completionTokens: completion.usage.completion_tokens,
                        totalTokens: completion.usage.total_tokens,
                    }
                    : undefined,
            };
        }

        // Standard text completion
        const completion = await this.client.chat.completions.create({
            model: this.model,
            messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096,
        });

        return {
            content: completion.choices[0]?.message?.content ?? '',
            usage: completion.usage
                ? {
                    promptTokens: completion.usage.prompt_tokens,
                    completionTokens: completion.usage.completion_tokens,
                    totalTokens: completion.usage.total_tokens,
                }
                : undefined,
        };
    }
}

/**
 * Create an OpenAI provider instance
 */
export function createOpenAIProvider(config?: ProviderConfig): LLMProvider {
    return new OpenAIProvider(config);
}
