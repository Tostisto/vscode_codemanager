import * as vscode from 'vscode';

export const getCurrentCodeLanguage = (): string => {
  return vscode.window.activeTextEditor?.document.languageId || '';
};

export const exportOpenAICode = (code: string, language: string) => {
  const regex = new RegExp('```' + language + '\n([\\s\\S]*)\n```', 'gm');
  const match = regex.exec(code);
  if (match) {
    return match[1];
  } else {
    const regex = /\`\`\`([\s\S]*)\`\`\`/gm;
    const match = regex.exec(code);
    if (match) {
      return match[1];
    }
    return code;
  }
};
