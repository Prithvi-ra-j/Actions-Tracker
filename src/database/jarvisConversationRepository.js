import { dbGet, dbPut, dbDelete, dbGetAll } from './db.js';

const STORE = 'jarvisConversations';
const DEFAULT_ID = 'jarvis_default';

function now() {
  return new Date().toISOString();
}

function createConversation(title = 'Jarvis') {
  const timestamp = now();
  return {
    id: `jarvis_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
  };
}

export async function getConversation(id = DEFAULT_ID) {
  return dbGet(STORE, id);
}

export async function getOrCreateConversation(id = DEFAULT_ID, title = 'Jarvis') {
  const existing = await getConversation(id);
  if (existing) return existing;

  const conversation = {
    ...createConversation(title),
    id,
  };

  await dbPut(STORE, conversation);
  return conversation;
}

export async function saveConversation(conversation) {
  const next = {
    ...conversation,
    updatedAt: now(),
    messages: Array.isArray(conversation.messages) ? conversation.messages.slice(-200) : [],
  };
  await dbPut(STORE, next);
  return next;
}

export async function appendConversationMessage(id, message) {
  const conversation = await getOrCreateConversation(id);
  conversation.messages = [...(conversation.messages || []), message].slice(-200);
  return saveConversation(conversation);
}

export async function updateConversation(id, updates) {
  const conversation = await getOrCreateConversation(id);
  return saveConversation({ ...conversation, ...updates });
}

export async function clearConversation(id = DEFAULT_ID) {
  await dbDelete(STORE, id);
}

export async function getAllConversations() {
  const all = await dbGetAll(STORE);
  return all.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export { DEFAULT_ID };
