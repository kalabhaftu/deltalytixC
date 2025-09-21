'use server'

import { prisma } from '@/lib/prisma'
import auth from '@/lib/translations/en/auth'
import { createClient } from '@/server/auth'
import { revalidatePath } from 'next/cache'


