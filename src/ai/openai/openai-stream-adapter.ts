import OpenAI from "openai";

export interface IAIStreamAdapter {
  notifyAi(message: string): Promise<void>;
}

// Generate a single chat completion
export class OpenAIStreamAdapter implements IAIStreamAdapter {
  // retains full chat history
  messages: any[] = [];
  client: OpenAI;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  addToolMessage(content: string, role = "tool") {
    this.messages.push({ content, role });
  }

  addSystemMessage(content: string, role = "system") {
    this.messages.push({ content, role });
  }

  async notifyAi(message: string) {
    this.addToolMessage(message);
    return await this.getAIStreamResponse();
  }

  async getAIStreamResponse() {
    const stream = this.client.beta.chat.completions.stream({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say this is a test" }],
      stream: true,
    });

    stream.on("content", (delta) => {
      this.parseChunk(delta);
    });

    const chatCompletion = await stream.finalChatCompletion();
    console.log(chatCompletion);
  }

  parseChunk(chunk: any): any {
    return chunk.choices[0]?.delta?.content;
  }
}
