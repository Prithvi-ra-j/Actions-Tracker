/**
 * Conversation Manager for Jarvis.
 * Keeps the LLM-facing history bounded while the UI persists the durable
 * conversation transcript in IndexedDB.
 */

class ConversationManager {
  constructor() {
    this.history = [];
  }

  initialize(systemPrompt) {
    this.history = systemPrompt ? [{ role: 'system', content: systemPrompt }] : [];
  }

  hydrateFromUiMessages(messages = []) {
    this.history = [];
    for (const message of messages) {
      if (!message || !['user', 'assistant', 'system'].includes(message.role)) continue;
      const content = message.llmContent ?? message.content;
      if (!content) continue;
      this.history.push({ role: message.role, content });
    }
  }

  appendMessage(role, content) {
    this.history.push({ role, content });
  }

  summarizeOlderMessages(messages) {
    const excerpts = messages
      .filter(message => message.role !== 'system')
      .map(message => `${message.role}: ${String(message.content).slice(0, 240)}`)
      .join('\n');
    return excerpts ? `Earlier conversation excerpts:\n${excerpts}` : '';
  }

  getHistory(maxTurns = 8) {
    const systemMessages = this.history.filter(message => message.role === 'system');
    const conversationalMessages = this.history.filter(message => message.role !== 'system');
    const olderMessages = conversationalMessages.slice(0, -maxTurns);
    const summary = this.summarizeOlderMessages(olderMessages);
    return [
      ...systemMessages,
      ...(summary ? [{ role: 'system', content: summary }] : []),
      ...conversationalMessages.slice(-maxTurns),
    ];
  }

  clear() {
    this.history = [];
  }
}

export const conversationManager = new ConversationManager();
