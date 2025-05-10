import Dexie from 'dexie'

const messageFields = [
  '++id',
  'conversationId',
  'timestamp',
  'role',
  'placement',
  'reasoning_content',
  'content',
  'loading',
  'isMarkdown',
  'typing',
  'noStyle',
]

class UseDexie {
  constructor() {
    this.db = new Dexie('ai-conversations')
    this.db.version(1).stores({
      messages: messageFields.join(','),
    })
  }

  async createTable(model) {
    await this.db.version(1).stores({
      [model]: '++id, title, createdAt, updatedAt',
    })
  }

  async tableExists(model) {
    const tables = await this.db.tables
    return tables.some((table) => table.name === model)
  }

  setCurrentModel(model) {
    this.model = model
  }

  async getConversations() {
    const conversations = await this.db[this.model].toArray()
    return conversations
  }

  async getConversation(id) {
    const conversation = await this.db[this.model].get({ id })
    return conversation
  }

  async deleteConversation(id) {
    await this.db[this.model].delete(id)
  }

  async updateConversation(id, conversation) {
    await this.db[this.model].update(id, conversation)
  }

  async addConversation(title) {
    const id = await this.db[this.model].add({ title, createdAt: new Date().getTime(), updatedAt: new Date().getTime() })
    return id
  }

  // 添加消息
  async addMessage(conversationId, message) {
    const id = await this.db.messages.add({ conversationId, timestamp: new Date().getTime(), ...message })
    return id
  }

  // 获取单条消息
  async getMessage(id) {
    const message = await this.db.messages.get(id)
    return message
  }

  // 获取多条消息
  async getMessages(conversationId) {
    const messages = await this.db.messages.where({ conversationId }).toArray()
    return messages
  }

  // 删除消息
  async deleteMessage(id) {
    await this.db.messages.delete(id)
  }

  // 删除多条消息
  async deleteMessages(conversationId) {
    await this.db.messages.where({ conversationId }).delete()
  }

  // 更新消息
  async updateMessage(id, message) {
    await this.db.messages.update(id, { ...message })
  }

  async close() {
    await this.db.close()
  }
}

export default UseDexie
