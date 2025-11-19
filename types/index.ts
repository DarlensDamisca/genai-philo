// types.ts
export interface Response {
  id: string
  question: string
  answer: string
  timestamp: string
  conversationId: string
}

export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}