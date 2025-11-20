'use server'

import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { WeeklyExpectation } from '@prisma/client'
import { randomUUID } from 'crypto'

export async function getWeeklyReview(startDate: Date) {
  const userId = await getUserId()
  if (!userId) return null

  try {
    // Normalize date to Monday
    const date = new Date(startDate)
    date.setHours(0, 0, 0, 0)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    const monday = new Date(date.setDate(diff))
    
    const review = await prisma.weeklyReview.findUnique({
      where: {
        userId_startDate: {
          userId,
          startDate: monday
        }
      }
    })
    
    return review
  } catch (error) {
    console.error('Error fetching weekly review:', error)
    return null
  }
}

export async function saveWeeklyReview(data: {
  startDate: Date
  endDate: Date
  calendarImage?: string
  expectation?: WeeklyExpectation
  actualOutcome?: WeeklyExpectation
  isCorrect?: boolean
  notes?: string
}) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  try {
    // Normalize date to Monday
    const date = new Date(data.startDate)
    date.setHours(0, 0, 0, 0)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(date.setDate(diff))
    
    const review = await prisma.weeklyReview.upsert({
      where: {
        userId_startDate: {
          userId,
          startDate: monday
        }
      },
      update: {
        ...data,
        startDate: monday // Ensure consistency
      },
      create: {
        id: randomUUID(),
        userId,
        ...data,
        startDate: monday
      }
    })
    
    return { success: true, data: review }
  } catch (error) {
    console.error('Error saving weekly review:', error)
    return { success: false, error: 'Failed to save review' }
  }
}

