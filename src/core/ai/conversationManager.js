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

  /**
   * Retrieves the current conversation history.
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clears the history.
   */
  clear() {
    this.history = [];
  }
}

export const conversationManager = new ConversationManager();
