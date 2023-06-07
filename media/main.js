// @ts-nocheck
// @ts-ignores
// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
  const vscode = acquireVsCodeApi();

  const oldState = vscode.getState() || { discussion: [] };

  let chat = oldState.discussion;

  const button = document.getElementById('generateButton');

  const promptInput = document.getElementById('prompt');

  const createMessageElement = (author, content) => {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.classList.add(author.toLowerCase());

    const authorElement = document.createElement('span');
    authorElement.className = 'author';
    authorElement.innerText = author;

    const contentElement = document.createElement('span');
    contentElement.className = 'content';
    contentElement.appendChild(content);

    messageElement.appendChild(authorElement);
    messageElement.appendChild(contentElement);

    return messageElement;
  };

  const createCodeElement = (code) => {
    const preElement = document.createElement('pre');
    const codeElement = document.createElement('code');

    codeElement.innerText = code;

    preElement.appendChild(codeElement);

    return preElement;
  };

  const createMessageContentElement = (messageElement) => {
    const element = document.createElement('div');
    element.innerHTML = messageElement;

    const regex = /```([\s\S]*?)```/g;
    const codeElements = element.innerHTML.match(regex);
    if (codeElements) {
      codeElements.forEach((codeElement) => {
        const removedLanguage = codeElement.replace(/```[\w]*\n?/g, '```');
        const code = removedLanguage.replace(/```/g, '');
        const codeHtml = createCodeElement(code);
        element.innerHTML = element.innerHTML.replace(codeElement, codeHtml.outerHTML);
      });
    }

    return element;
  };

  const appendMessage = (role, message) => {
    let messageContent = createMessageContentElement(message);

    let newMessage = createMessageElement(role, messageContent);

    const container = document.getElementsByClassName('message_container')[0];

    container.appendChild(newMessage);

    newMessage.scrollIntoView();
  };

  const clearMessages = () => {
    const container = document.getElementsByClassName('message_container')[0];

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
  };

  const onGenerate = () => {
    if (promptInput.value === '/clear') {
      clearMessages();

      chat = [];

      vscode.setState({ discussion: chat });

      vscode.postMessage({
        command: 'clear',
        message: null,
      });
    } else {
      updateChat('user', promptInput.value);

      vscode.postMessage({
        command: 'generate',
        message: promptInput.value,
      });

      appendMessage('User', promptInput.value);
    }

    promptInput.value = '';

    promptInput.focus();
  };

  const updateChat = (role, newChatItem) => {
    chat.push({ role: role, content: newChatItem });

    vscode.setState({ discussion: chat });
  };

  button.addEventListener('click', onGenerate);

  // handle messages sent from the extension to the webview
  window.addEventListener('message', (event) => {
    const message = event.data;

    appendMessage('Assistant', message.text);

    updateChat('assistant', message.text);
  });
})();
