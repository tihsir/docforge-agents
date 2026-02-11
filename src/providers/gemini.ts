/**
 * Gemini Provider Implementation
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type {
    LLMProvider,
    GenerateOptions,
    GenerateResponse,
    ProviderConfig,
} from './types.js';

const DEFAULT_MODEL = 'gemini-1.5-pro';

/**
 * Google Gemini LLM provider
 */
export class GeminiProvider implements LLMProvider {
    readonly name = 'gemini';
    private client: GoogleGenerativeAI | null = null;
    private model: string;
    private apiKey: string | undefined;

    constructor(config?: ProviderConfig) {
        this.apiKey = config?.apiKey ?? process.env.GEMINI_API_KEY;
        this.model = config?.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;

        if (this.apiKey) {
            this.client = new GoogleGenerativeAI(this.apiKey);
        }
    }

    isConfigured(): boolean {
        return this.client !== null;
    }

    getConfigInstructions(): string {
        return `To use the Gemini provider, set the following environment variables:

  GEMINI_API_KEY=your-api-key-here

Optional:
  GEMINI_MODEL=gemini-1.5-pro (default: gemini-1.5-pro)

You can get an API key at: https://aistudio.google.com/app/apikey`;
    }

    async generate(options: GenerateOptions): Promise<GenerateResponse> {
        if (!this.client) {
            throw new Error('Gemini provider not configured. ' + this.getConfigInstructions());
        }

        const model = this.client.getGenerativeModel({
            model: this.model,
            systemInstruction: options.systemPrompt,
        });

        // Convert messages to Gemini format
        // Gemini expects strictly alternating user/model roles for chat history
        // However, we'll try sending pure content first or constructing history
        // based on the role mapping.

        // Note: GoogleGenerativeAI SDK handles conversation history differently
        // We need to separate history from the last user message

        let history = [];
        let lastMessage = '';

        // Simple conversion: last message is the prompt, previous are history
        // This is a simplification; a more robust approach would validate the sequence
        if (options.messages.length > 0) {
            const lastMsg = options.messages[options.messages.length - 1];
            if (lastMsg.role === 'user') {
                lastMessage = lastMsg.content;

                // Process previous messages as history
                for (let i = 0; i < options.messages.length - 1; i++) {
                    const msg = options.messages[i];
                    if (msg.role === 'system') continue; // System prompt handled separately

                    history.push({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.content }],
                    });
                }
            } else {
                // Should not happen in typical chat flow where user asks last
                // But for safety, just concat everything
                lastMessage = options.messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
            }
        }

        const generationConfig = {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 8192,
            responseMimeType: options.jsonSchema ? "application/json" : "text/plain",
            responseSchema: options.jsonSchema as any, // Cast because zod types might differ slightly in structure expected by SDK
        };

        const chatSession = model.startChat({
            history,
            generationConfig,
        });

        const result = await chatSession.sendMessage(lastMessage);
        const response = result.response;
        const text = response.text();

        // Calculate usage if available (Gemini API provides usage metadata)
        const usageMetadata = response.usageMetadata;

        return {
            content: text,
            parsed: options.jsonSchema ? JSON.parse(text) : undefined,
            usage: usageMetadata ? {
                promptTokens: usageMetadata.promptTokenCount,
                completionTokens: usageMetadata.candidatesTokenCount,
                totalTokens: usageMetadata.totalTokenCount,
            } : undefined
        };
    }
}

/**
 * Create a Gemini provider instance
 */
export function createGeminiProvider(config?: ProviderConfig): LLMProvider {
    return new GeminiProvider(config);
}
