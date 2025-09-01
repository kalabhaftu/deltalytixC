"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Send, RotateCcw, MessageSquare, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useUserStore } from "@/store/user-store"
import { useChatStore } from "@/store/chat-store"
import { useCurrentLocale, useI18n } from "@/locales/client"
import { format } from "date-fns"

// Simple message interface
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

interface ChatWidgetProps {
  size?: 'small' | 'medium' | 'large'
}

export default function ChatWidget({ size = "large" }: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { supabaseUser: user } = useUserStore.getState()
  const locale = useCurrentLocale()
  const t = useI18n()

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Auto-initialize chat when component mounts
  useEffect(() => {
    if (!isInitialized && user) {
      initializeChat()
    }
  }, [user, isInitialized])

  const initializeChat = useCallback(async () => {
    if (isInitialized) return
    
    setIsLoading(true)
    setIsInitialized(true)
    
    try {
      // Send initial greeting request
      const response = await fetch('/api/ai/chat-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are a helpful trading psychology coach. Greet the user warmly and offer to help with their trading journey. Keep it brief and engaging. User: ${user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Trader'}`
            }
          ],
          username: user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User",
          locale: locale,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to initialize chat')
      }

      const data = await response.json()
      
      const greetingMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content || "Hello! I'm your trading psychology coach. How can I help you today?",
        timestamp: new Date()
      }
      
      setMessages([greetingMessage])
    } catch (err) {
      console.error('Failed to initialize chat:', err)
      setError('Failed to start chat. Please try again.')
      setIsInitialized(false)
    } finally {
      setIsLoading(false)
    }
  }, [user, locale, isInitialized])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      // Convert messages to proper format for API
      const apiMessages = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))

      const response = await fetch('/api/ai/chat-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: apiMessages,
          username: user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User",
          locale: locale,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send message')
      }

      const data = await response.json()
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content || 'Sorry, I could not process your request.',
        timestamp: new Date()
      }
      
      setMessages([...updatedMessages, assistantMessage])
    } catch (err: any) {
      console.error('Chat error:', err)
      setError(err.message || 'Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, user, locale, isLoading])

  const handleReset = useCallback(() => {
    setMessages([])
    setIsInitialized(false)
    setError(null)
    initializeChat()
  }, [initializeChat])

  if (!user) {
    return (
      <Card className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to use the chat</p>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">AI Trading Coach</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <CardContent className="flex-1 flex flex-col min-h-0 p-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20"
            >
              <div className="font-medium text-sm">Error</div>
              <div className="text-xs mt-1">{error}</div>
              <Button 
                size="sm" 
                variant="outline" 
                className="mt-2" 
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </motion.div>
          )}

          {!isInitialized && isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Starting conversation...</span>
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {format(message.timestamp, 'HH:mm')}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="max-w-[80%] p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "AI is thinking..." : "Type your message..."}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}




