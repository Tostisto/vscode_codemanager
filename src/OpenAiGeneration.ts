import { Configuration, OpenAIApi, ChatCompletionRequestMessage } from 'openai';
import * as vscode from 'vscode';

export class OpenAiGeneration {
  private _configuration: Configuration;

  private _openai: OpenAIApi;

  constructor(apiKey: string) {
    this._configuration = new Configuration({
      apiKey: apiKey,
    });

    this._openai = new OpenAIApi(this._configuration);
  }

  public updateApiKey(apiKey: string) {
    this._configuration = new Configuration({
      apiKey: apiKey,
    });

    this._openai = new OpenAIApi(this._configuration);
  }

  public generateCompletion = (text: string): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      this._openai
        .createChatCompletion({
          model: 'gpt-3.5-turbo-0613',
          messages: [{ role: 'user', content: text }],
          functions: [
            {
                "name": "openai_code_generator",
                "description": "Generates code from a prompt.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "code": {
                            "type": "string",
                            "description": "Function code",
                        },
                    },
                    "required": ["code"],
                },
            }
        ],
        function_call: {"name": "openai_code_generator"}
        })
        .then((response) => {
          if (response.data.choices[0].finish_reason === 'length') {
            throw new Error('Response too long. Please try again with a shorter prompt.');
          } else if (response.data.choices[0].finish_reason === 'timeout') {
            throw new Error('Response timed out. Please try again with a shorter prompt.');
          } else if (response.data.choices[0].finish_reason === 'incomplete') {
            throw new Error('Response incomplete. Please try again with a shorter prompt.');
          } else {
            resolve(response.data.choices[0].message?.content || '');
          }
        })
        .catch((err) => {
          reject(`OpenAI Error: ${err.response.status} ${err.response.statusText}`);
        });
    });
  };

  public generateChat = (chat: Array<ChatCompletionRequestMessage>): Promise<ChatCompletionRequestMessage> => {
    return new Promise<ChatCompletionRequestMessage>((resolve, reject) => {
      this._openai
        .createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: chat,
        })
        .then((response) => {
          if (response.data.choices[0].finish_reason === 'length') {
            throw new Error('Response too long. Please try again with a shorter prompt.');
          } else if (response.data.choices[0].finish_reason === 'timeout') {
            throw new Error('Response timed out. Please try again with a shorter prompt.');
          } else if (response.data.choices[0].finish_reason === 'incomplete') {
            throw new Error('Response incomplete. Please try again with a shorter prompt.');
          } else {
            resolve(response.data.choices[0].message as ChatCompletionRequestMessage);
          }
        })
        .catch((err) => {
          reject(`OpenAI Error: ${err.response.status} ${err.response.statusText}`);
        });
    });
  };
}
