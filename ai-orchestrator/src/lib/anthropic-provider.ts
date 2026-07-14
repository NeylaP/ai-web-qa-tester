import Anthropic from '@anthropic-ai/sdk';
import type { AiProvider } from '@ai-web-qa-tester/core-domain';

export class AnthropicProvider implements AiProvider {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content[0];
    if (block.type !== 'text') return '';
    return block.text;
  }
}
