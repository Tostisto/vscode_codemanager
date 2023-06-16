import * as vscode from 'vscode';

export const getCurrentCodeLanguage = (): string => {
  return vscode.window.activeTextEditor?.document.languageId || '';
};