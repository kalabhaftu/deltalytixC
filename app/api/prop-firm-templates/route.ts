/**
 * Prop Firm Templates API
 * GET /api/prop-firm-templates - Get all prop firm rule templates
 */

import { NextResponse } from 'next/server'
import propFirmTemplates from '@/lib/data/prop-firm-templates.json'

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: propFirmTemplates
    })
  } catch (error) {
    console.error('Error fetching prop firm templates:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch prop firm templates' 
      },
      { status: 500 }
    )
  }
}

