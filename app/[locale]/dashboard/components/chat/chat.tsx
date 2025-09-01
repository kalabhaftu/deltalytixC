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
import { UIMessage } from '@ai-sdk/react'
import { BotMessage } from "./bot-message"
import { UserMessage } from "./user-message"
import { ChatInput } from "./input"
import { ChatHeader } from "./header"
import { loadChat, saveChat } from "./actions/chat"
import { useMoodStore } from "@/store/mood-store"

type Message = UIMessage

interface ChatWidgetProps {
  size?: 'tiny' | 'small' | 'small-long' | 'medium' | 'large' | 'extra-large'
}

export default function ChatWidget({ size = 'large' }: ChatWidgetProps) {
  const { supabaseUser: user } = useUserStore.getState()
  const locale = useCurrentLocale()
  const t = useI18n()
  const timezone = useUserStore(state => state.timezone)
  const { messages: storedMessages, setMessages: setStoredMessages } = useChatStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const moods = useMoodStore(state => state.moods)
  const setMoods = useMoodStore(state => state.setMoods)

  // Load stored messages when component mounts
  useEffect(() => {
    const loadStoredMessages = async () => {
      if (!user?.id || storedMessages.length > 0) return
      
      try {
        if (moods.length > 0) {
          const currentDay = format(new Date(), 'yyyy-MM-dd')
          const currentMood = moods.find(mood => format(mood.day, 'yyyy-MM-dd') === currentDay)
          if (currentMood && currentMood.conversation) {
            try {
              const parsedConversation = JSON.parse(currentMood.conversation as string)
                             const validMessages = parsedConversation.map((msg: any) => ({
                 id: msg.id,
                 role: msg.role,
                 parts: [{ type: 'text', text: msg.content }] as any
               }))
              setMessages(validMessages as Message[])
              setStoredMessages(validMessages as Message[])
            } catch (e) {
              console.error('Failed to parse conversation:', e)
              setMessages([])
            }
          }
        }
      } catch (error) {
        console.error('Failed to load messages:', error)
      }
    }
    
    loadStoredMessages()
  }, [user?.id, moods, setStoredMessages])

  // Initialize chat when user is available
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
             // Initialize with a simple greeting
       const greetingMessage: Message = {
         id: Date.now().toString(),
         role: 'assistant',
         parts: [{ type: 'text', text: `Hello ${user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Trader'}! 👋 Welcome to your AI Trading Coach. I'm here to help you with your trading psychology and performance analysis. How can I assist you today?` }] as any
       }
      
      setMessages([greetingMessage])
    } catch (err) {
      console.error('Failed to initialize chat:', err)
      setError('Failed to start chat. Please try again.')
      setIsInitialized(false)
    } finally {
      setIsLoading(false)
    }
  }, [user, isInitialized])

  const handleSubmit = useCallback(async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.()
    if (!input.trim() || isLoading) return

         const userMessage: Message = {
       id: Date.now().toString(),
       role: 'user',
       parts: [{ type: 'text', text: input }] as any
     }
    
    setMessages(prevMessages => [...prevMessages, userMessage])
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...messages.map(msg => ({
              role: msg.role,
                               content: (msg.parts?.[0] as any)?.text || ''
            })),
            { role: 'user', content: input }
          ],
          username: user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User",
          locale: locale,
          timezone,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from AI')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

             const assistantMessage: Message = {
         id: (Date.now() + 1).toString(),
         role: 'assistant',
         parts: [{ type: 'text', text: '' }] as any
       }
      
      setMessages(prevMessages => [...prevMessages, assistantMessage])

      // Read the streaming response
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'text-delta' && parsed.textDelta) {
                fullText += parsed.textDelta
                setMessages(prevMessages => {
                  const newMessages = [...prevMessages]
                  const lastMessage = newMessages[newMessages.length - 1]
                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.parts = [{ type: 'text', text: fullText }]
                  }
                  return newMessages
                })
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }

      // Save the conversation
      if (user?.id) {
        const updatedMood = await saveChat(user.id, [...messages, userMessage, assistantMessage])
        if (updatedMood) {
          const currentDay = format(new Date(), 'yyyy-MM-dd')
          const currentMoodIndex = moods.findIndex(mood => format(mood.day, 'yyyy-MM-dd') === currentDay)
          
          if (currentMoodIndex !== -1) {
            const newMoods = [...moods]
            newMoods[currentMoodIndex] = updatedMood
            setMoods(newMoods)
          } else {
            setMoods([...moods, updatedMood])
          }
        }
        setStoredMessages([...messages, userMessage, assistantMessage])
      }

    } catch (err) {
      console.error('Failed to send message:', err)
      setError('Failed to send message. Please try again.')
      
      // Remove the user message if there was an error
      setMessages(prevMessages => prevMessages.slice(0, -1))
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages, user, locale, timezone, moods, setMoods, setStoredMessages])

  const handleReset = useCallback(async () => {
    setMessages([])
    setStoredMessages([])
    setIsInitialized(false)
    setError(null)
  }, [setStoredMessages])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages])

  return (
    <Card className="h-full flex flex-col bg-background relative">
      <ChatHeader 
        title="AI Assistant" 
        onReset={handleReset} 
        isLoading={isLoading} 
        size={size} 
      />
      <CardContent className="flex-1 flex flex-col min-h-0 p-0 relative">
        <div
          className="flex-1 min-h-0 w-full overflow-y-auto"
          style={{ overscrollBehavior: "contain" }}
          ref={scrollContainerRef}
        >
          <div className="p-4">
            <AnimatePresence mode="popLayout">
              {error && (
                <motion.div
                  className="p-3 rounded-lg break-words overflow-hidden bg-destructive/10 text-destructive border border-destructive/20 mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="flex items-center justify-between">
                    <span>{error}</span>
                    <Button 
                      type="button" 
                      onClick={() => setError(null)} 
                      size="sm" 
                      variant="outline"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                </motion.div>
              )}

              {messages.map((message) => {
                switch (message.role) {
                  case "user":
                    return (
                      <UserMessage key={message.id}>
                        {(message.parts?.[0] as any)?.text || ''}
                      </UserMessage>
                    )
                  case "assistant":
                    return (
                      <BotMessage
                        key={message.id}
                        status={isLoading ? "streaming" : "ready"}
                      >
                        {(message.parts?.[0] as any)?.text || ''}
                      </BotMessage>
                    )
                  default:
                    return null
                }
              })}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-2 text-muted-foreground text-sm py-2"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AI is thinking...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <ChatInput
          onSend={handleSubmit}
          status={isLoading ? "streaming" : "ready"}
          stop={() => setIsLoading(false)}
          input={input}
          handleInputChange={(e) => setInput(e.target.value)}
        />
      </CardContent>

      {!isInitialized && !isLoading && storedMessages.length === 0 && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-4 sm:p-6 space-y-4 sm:space-y-6 text-center">
            <div className="flex justify-center">
              <div className="p-2 sm:p-3 rounded-full bg-primary/10">
                <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-semibold tracking-tight">
                {t('chat.overlay.welcome')}
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                {t('chat.overlay.description')}
              </p>
            </div>
            <Button
              onClick={() => {
                setIsInitialized(true)
                initializeChat()
              }}
              size="lg"
              className="w-full text-sm sm:text-base animate-in fade-in zoom-in"
            >
              {t('chat.overlay.startButton')}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}