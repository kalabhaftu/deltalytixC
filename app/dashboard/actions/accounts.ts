"use server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/server/auth"
import { revalidatePath } from "next/cache"

export async function ensureAccountAndAssignGroup(
  accountNumber: string,
  groupId: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "User not found" }
  }
  try {
    // Check if account exists
    let account = await prisma.account.findUnique({
      where: {
        number_userId: {
          number: accountNumber,
          userId: user.id,
        },
      },
    })

    // Create if it doesn't exist
    if (!account) {
      account = await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          number: accountNumber,
          userId: user.id,
        },
      })
    }

    // Groups removed - no longer used
    // Account is created/ensured, no group assignment needed

    return { success: true }
  } catch (error) {
    return { success: false, error: "Failed to assign account to group" }
  }
} 

export async function getAccounts() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        number: true,
        // groupId removed - no longer used
      },
    })
    return accounts
  } catch (error) {
    return []
  }
}
