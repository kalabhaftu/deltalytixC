/**
 * API Response Wrapper
 * Ensures all API responses follow a consistent JSON schema
 */

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export interface APIStreamResponse {
  success: boolean
  stream?: ReadableStream
  error?: string
  code?: string
}

/**
 * Creates a standardized success response
 */
export function createSuccessResponse<T>(data: T): Response {
  return new Response(JSON.stringify({
    success: true,
    data
  }), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  })
}

/**
 * Creates a standardized error response
 */
export function createErrorResponse(error: string, code?: string, status: number = 500): Response {
  return new Response(JSON.stringify({
    success: false,
    error,
    code
  }), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  })
}

/**
 * Wraps AI streaming responses in a proper JSON structure
 */
export function createAIStreamResponse(aiStreamResult: any, analysisType?: string): Response {
  try {
    // For AI analysis, we need to wrap the stream response properly
    if (analysisType) {
      // Create a custom stream that wraps AI content in JSON structure
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send the opening JSON structure
            const openingJson = JSON.stringify({
              success: true,
              data: {
                type: analysisType,
                content: ""
              }
            }).slice(0, -2) // Remove the closing "}
            
            controller.enqueue(new TextEncoder().encode(openingJson))
            
            // Get the AI stream
            const reader = aiStreamResult.textStream?.getReader() || aiStreamResult.getReader?.()
            
            if (reader) {
              let isFirstChunk = true
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                
                const chunk = typeof value === 'string' ? value : new TextDecoder().decode(value)
                
                // Escape and add content to the JSON structure
                const escapedChunk = JSON.stringify(chunk).slice(1, -1) // Remove quotes
                const jsonChunk = isFirstChunk ? `"${escapedChunk}` : escapedChunk
                
                controller.enqueue(new TextEncoder().encode(jsonChunk))
                isFirstChunk = false
              }
            }
            
            // Close the JSON structure
            controller.enqueue(new TextEncoder().encode('"}}}'))
            controller.close()
          } catch (error) {
            console.error('Error in AI stream wrapper:', error)
            controller.error(error)
          }
        }
      })
      
      return new Response(stream, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })
    }
    
    // For regular streaming responses, return as-is
    return aiStreamResult.toDataStreamResponse()
  } catch (error) {
    console.error('Error creating AI stream response:', error)
    return createErrorResponse('Failed to create AI response stream', 'STREAM_ERROR')
  }
}

/**
 * Safely parses JSON with fallback
 */
export function safeJsonParse<T = any>(text: string): { success: boolean; data?: T; error?: string } {
  try {
    // Clean common streaming artifacts
    const cleanText = text
      .replace(/^data: /gm, '') // Remove "data: " prefixes
      .replace(/^\d+:"/, '"')   // Remove number prefixes like "3:"
      .replace(/\\n/g, '\n')    // Unescape newlines
      .trim()
    
    // Try to parse the cleaned text
    const parsed = JSON.parse(cleanText)
    return { success: true, data: parsed }
  } catch (error) {
    // If it's not JSON, try to extract content from streaming format
    try {
      // Look for JSON-like content in streaming response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return { success: true, data: parsed }
      }
    } catch (innerError) {
      // Ignore inner parsing errors
    }
    
    return { 
      success: false, 
      error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }
  }
}

/**
 * Validates API response structure
 */
export function validateAPIResponse(response: any): response is APIResponse {
  return typeof response === 'object' && 
         response !== null && 
         typeof response.success === 'boolean'
}

/**
 * Wraps fetch calls with proper error handling and JSON parsing
 */
export async function safeFetch<T = any>(
  url: string, 
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(url, options)
    
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`
      }
    }
    
    const text = await response.text()
    const parseResult = safeJsonParse<APIResponse<T>>(text)
    
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error || 'Failed to parse response'
      }
    }
    
    const apiResponse = parseResult.data
    if (!validateAPIResponse(apiResponse)) {
      return {
        success: false,
        error: 'Invalid API response format'
      }
    }
    
    if (!apiResponse.success) {
      return {
        success: false,
        error: apiResponse.error || 'API request failed'
      }
    }
    
    return {
      success: true,
      data: apiResponse.data
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    }
  }
}

