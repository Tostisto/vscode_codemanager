import { ChatCompletionRequestMessage } from 'openai';
import { OpenAiGeneration } from './OpenAiGeneration';

export class SidebarChat {
  private chat: Array<ChatCompletionRequestMessage> = [];

  constructor(private readonly _openAiGeneration: OpenAiGeneration) {}

  public receiveMessage(data: any): Promise<string> {
    if (data.command === 'clear') {
      this._clearChat();

      return new Promise((resolve) => {
        resolve('Chat cleared.');
      });
    } else if (data.command === 'generate') {
      return this.generateChatResponse(data.message);
    } else {
      return new Promise((resolve) => {
        resolve('Unknown command.');
      });
    }
  }

  private _clearChat(): void {
    this.chat = [];
  }

  public generateChatResponse(message: string): Promise<string> {
    this.chat.push({ role: 'user', content: message });

    return this._openAiGeneration
      .generateChat(this.chat)
      .then((response) => {
        this.chat.push(response);
        return response.content;
      })
      .catch((err) => {
        return err;
      });
  }
}
