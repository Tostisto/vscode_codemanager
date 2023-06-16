import * as vscode from 'vscode';
import { getCurrentCodeLanguage } from './utils';
import { SidebarChatViewProvider } from './SidebarChatViewProvider';
import { OpenAiGeneration } from './OpenAiGeneration';

interface SelectedText {
  text: string;
  range: vscode.Range;
}

class CodeManager {
  private readonly OpenAIGeneration: OpenAiGeneration;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.OpenAIGeneration = new OpenAiGeneration(this.getOpenAiKey());
  }

  activate() {
    const provider = new SidebarChatViewProvider(this.context.extensionUri, this.OpenAIGeneration);

    this.context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(SidebarChatViewProvider.viewType, provider)
    );

    this.registerCommands();
    this.registerCodeActions();
    this.registerSettingsChangeEvent();
  }

  private registerCommands() {
    vscode.commands.registerCommand('codemanager.generateDoc', this.generateDocumentation);
    vscode.commands.registerCommand('codemanager.refactorCode', this.refactorCode);
    vscode.commands.registerCommand('codemanager.fixCode', this.fixCode);
    vscode.commands.registerCommand('codemanager.customCodePrompt', this.customCodePrompt);

    // diff commands
    vscode.commands.registerCommand('codemanager.diff', this.diffCode);
  }

  private generateDocumentation = async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const selectedText: SelectedText = this.getSelectedText(editor);
      const prompt = this.generatePrompt(selectedText.text, 'Generate a comment or docstring');

      this.generateCodeWithProgress(editor, prompt, selectedText);
    }
  };

  private refactorCode = async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const selectedText: SelectedText = this.getSelectedText(editor);
      const prompt = this.generatePrompt(selectedText.text, 'Refactorize following function');

      this.generateCodeWithProgress(editor, prompt, selectedText);
    }
  };

  private fixCode = async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const selectedText: SelectedText = this.getSelectedText(editor);

      const problem = await vscode.window.showInputBox({
        value: 'Type your code problem here',
        placeHolder: 'Type your code problem here',
        prompt: 'Type your code problem here',
        validateInput: (text) => {
          return text === '' ? 'Please type your message' : null;
        },
      });

      if (problem) {
        const prompt = this.generatePrompt(
          selectedText.text,
          'Generate a fix for the following code based on the error information',
          problem
        );

        this.generateCodeWithProgress(editor, prompt, selectedText);
      }
    }
  };

  private customCodePrompt = async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const selectedText: SelectedText = this.getSelectedText(editor);

      const customPrompt = await vscode.window.showInputBox({
        value: 'Type your prompt here',
        placeHolder: 'Type your prompt here',
        prompt: 'Type your prompt here',
        validateInput: (text) => {
          return text === '' ? 'Please type your message' : null;
        },
      });

      if (customPrompt) {
        const prompt = this.generatePrompt(selectedText.text, customPrompt);

        this.generateCodeWithProgress(editor, prompt, selectedText);
      }
    }
  };

  private registerCodeActions() {
    const codeActionsProvider = {
      provideCodeActions: (document: vscode.TextDocument, range: vscode.Range) => {
        const fixTypoAction = new vscode.CodeAction('Refactorize Selected Code', vscode.CodeActionKind.Refactor);
        fixTypoAction.command = {
          command: 'codemanager.refactorCode',
          title: 'Refactorize Selected Code',
          arguments: [],
        };
        const generateDocAction = new vscode.CodeAction('Generate Documentation', vscode.CodeActionKind.Refactor);
        generateDocAction.command = {
          command: 'codemanager.generateDoc',
          title: 'Generate Documentation',
          arguments: [],
        };
        const fixCodeAction = new vscode.CodeAction('Fix Code', vscode.CodeActionKind.Refactor);
        fixCodeAction.command = {
          command: 'codemanager.fixCode',
          title: 'Fix Code',
          arguments: [],
        };
        const customPromptAction = new vscode.CodeAction('Custom Prompt', vscode.CodeActionKind.Refactor);
        customPromptAction.command = {
          command: 'codemanager.customCodePrompt',
          title: 'Custom Prompt',
          arguments: [],
        };

        return [fixTypoAction, generateDocAction, fixCodeAction, customPromptAction];
      },
    };

    vscode.languages.registerCodeActionsProvider('*', codeActionsProvider);
  }

  private registerSettingsChangeEvent() {
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('codeManager')) {
        vscode.window.showInformationMessage('CodeManager settings updated successfully.');

        const openAiKey = this.getOpenAiKey();
        this.OpenAIGeneration.updateApiKey(openAiKey);
      }
    });
  }

  private getOpenAiKey(): string {
    const config = vscode.workspace.getConfiguration('codeManager');
    const openAiKey: string = config.get('openAiKey') || '';

    if (openAiKey === '') {
      vscode.window.showErrorMessage('OpenAI key not set. Please set it in the settings.');
    }

    return openAiKey;
  }

  private getSelectedText(editor: vscode.TextEditor): SelectedText {
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    const startLine = selection.start.line;
    const endLine = selection.end.line;

    const startCharacter = selection.start.character;
    const endCharacter = selection.end.character;

    const range = new vscode.Range(
      new vscode.Position(startLine, startCharacter),
      new vscode.Position(endLine, endCharacter)
    );

    return {
      text: selectedText,
      range,
    };
  }

  private generatePrompt(selectedText: string, message: string, additionalText?: string): string {
    const prompt = `${message} for the given function using the appropriate language-specific documentation format.\n\nFunction:\n\`\`\`${selectedText}\`\`\`\n\nLanguage: ${getCurrentCodeLanguage()}`;

    if (additionalText) {
      return `${prompt}\n\n${additionalText}`;
    }

    return prompt;
  }

  private async generateCodeWithProgress(editor: vscode.TextEditor, prompt: string, selectedText: SelectedText) {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating code...',
        cancellable: false,
      },
      async (progress, token) => {
        try {
          const response = await this.OpenAIGeneration.generateCompletion(prompt);

          this.diffCode(selectedText, response);
        } catch (err: any) {
          vscode.window.showErrorMessage(err);
        }
      }
    );
  }

  private diffCode(replacePosition: SelectedText, newCode: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    const originalText = editor.document.getText();

    const startLine = replacePosition.range.start.line;
    const startChar = replacePosition.range.start.character;
    const endLine = replacePosition.range.end.line;
    const endChar = replacePosition.range.end.character;

    const lines = originalText.split('\n');
    const modifiedLines = [...lines.slice(0, startLine), newCode, ...lines.slice(endLine + 1)];
    modifiedLines[startLine] = lines[startLine].slice(0, startChar) + newCode + lines[endLine].slice(endChar);

    const modifiedText = modifiedLines.join('\n');

    const originalUri = editor.document.uri;
    const modifiedUri = originalUri.with({ scheme: 'untitled', path: 'modified-' + originalUri.path });

    // Create a new untitled file with the modified code
    vscode.workspace.openTextDocument(modifiedUri).then((document) => {
      const edit = new vscode.WorkspaceEdit();
      edit.insert(modifiedUri, new vscode.Position(0, 0), modifiedText);
      vscode.workspace.applyEdit(edit).then(() => {
        // Show the diff view for the original and modified files
        vscode.commands
          .executeCommand('vscode.diff', modifiedUri, originalUri, 'Diff', {
            originalEditable: true,
            modifiedEditable: true,
            preserveFocus: true,
            preview: true,
            renderSideBySide: true,
            ignoreTrimWhitespace: true,
            showFiles: false,
            contextLines: 0,
          })
          .then(() => {
            vscode.window.showInformationMessage('Code generated successfully.');
          });
      });
    });
  }
}

export const activate = (context: vscode.ExtensionContext) => {
  const codeManager = new CodeManager(context);
  codeManager.activate();
};

export const deactivate = () => {};
