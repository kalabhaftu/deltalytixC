'use server'
import { UIMessage } from "@ai-sdk/react"

type Message = UIMessage
import { prisma } from "@/lib/prisma"
import { addDays, format } from "date-fns"
import { Mood } from "@prisma/client"
import { revalidateTag } from "next/cache"

export async function saveChat(userId: string, messages: Message[]): Promise<Mood | null> {
  console.log('Saving chat')
  const today = new Date()
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12))

  // Simplify messages for storage
  const textOnlyMessages = messages.map(msg => ({
    id: (msg as any).id || Math.random().toString(),
    role: msg.role,
    content: msg.role === 'user' ? (msg as any).content : 
             msg.role === 'assistant' ? (msg as any).content || 'AI response' : 
             msg.role === 'system' ? (msg as any).content || 'System message' : 
             JSON.stringify(msg),
  }))

  // Try to find existing mood entry for today
  const existingMood = await prisma.mood.findFirst({
    where: {
      userId,
      day: {
        gte: todayUTC,
        lt: addDays(todayUTC, 1),
      },
    },
  })

  revalidateTag(`user-data-${userId}`)

  if (existingMood) {
    // Update existing mood entry
    const updatedMood = await prisma.mood.update({
      where: {
        id: existingMood.id,
      },
      data: {
        conversation: JSON.stringify(textOnlyMessages),
      },
    })
    return updatedMood
  } else {
    // Create new mood entry
    const newMood = await prisma.mood.create({
      data: {
        userId,
        day: todayUTC,
        mood: "NEUTRAL", // Default mood
        conversation: JSON.stringify(textOnlyMessages),
      },
    })
    return newMood
  }
}

export async function loadChat(userId: string): Promise<Message[]> {
  console.log('Loading chat')
  const today = new Date()
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12))

  // Find mood entry for today
  const mood = await prisma.mood.findFirst({
    where: {
      userId,
      day: {
        gte: todayUTC,
        lt: addDays(todayUTC, 1),
      },
    },
  })

  revalidateTag(`user-data-${userId}`)
  console.log('Mood', mood)

  // Return conversation if it exists, otherwise empty array
  return mood?.conversation ? JSON.parse(mood.conversation as string) : []
}