/**
 * Conversation Manager for Jarvis
 * Handles multi-turn conversational state, keeping track of messages in memory.
 */

class ConversationManager {
  constructor() {
    this.history = [];
  }

  /**
   * Initializes the conversation with a system prompt and context.
   */
  initialize(systemPrompt) {
    this.history = [
      { role: 'system', content: systemPrompt }
    ];
  }

  /**
   * Appends a message to the conversation history.
   */
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

  /**
   * Retrieves the current conversation history.
   */
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

  /**
   * Clears the history.
   */
  clear() {
    this.history = [];
  }
}

export const conversationManager = new ConversationManager();
