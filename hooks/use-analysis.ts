import { useCallback, useRef } from 'react'
import { useAnalysisStore } from '@/store/analysis-store'
import { useCompletion } from '@ai-sdk/react'
import { safeJsonParse, safeFetch } from '@/lib/api-response-wrapper'

export type AnalysisSection = 'global' | 'instrument' | 'accounts' | 'timeOfDay'

export function useAnalysis() {
  const {
    setSectionData,
    setLoading,
    setError,
    isLoading,
    error,
    getSectionData,
    getSummary,
    getLastUpdated
  } = useAnalysisStore()

  // Track the current section being analyzed
  const currentSectionRef = useRef<AnalysisSection | null>(null)

  const {
    complete,
    completion,
    isLoading: isCompleting,
    error: completionError
  } = useCompletion({
    api: '/api/ai/analysis',
    onFinish: (prompt, completion) => {
      try {
        // Try to parse the completion as JSON
        const parsedData = JSON.parse(completion)
        
        // Use the tracked current section instead of trying to parse the title
        const section = currentSectionRef.current || 'global'
        
        // Store the parsed data
        setSectionData(section, parsedData)
        
        // Clear the current section ref
        currentSectionRef.current = null
      } catch (parseError) {
        console.error('Failed to parse analysis response:', parseError)
        const section = currentSectionRef.current || 'global'
        setError(section, 'Failed to parse analysis response. Please try again.')
        setLoading(section, false)
        currentSectionRef.current = null
      }
    },
    onError: (error) => {
      console.error('Analysis completion error:', error)
      const section = currentSectionRef.current || 'global'
      
      // Provide more user-friendly error messages
      let errorMessage = 'Network error occurred. Please check your connection and try again.'
      
      if (error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.'
      } else if (error.message.includes('400')) {
        errorMessage = 'Invalid request. Please refresh the page and try again.'
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error. Please try again in a few moments.'
      } else if (error.message.includes('TypeError')) {
        errorMessage = 'Connection error. Please refresh the page and try again.'
      }
      
      setError(section, errorMessage)
      setLoading(section, false)
      currentSectionRef.current = null
    }
  })

  // Combine store loading state with completion loading state
  const combinedLoading = {
    global: isLoading.global || (isCompleting && currentSectionRef.current === 'global'),
    instrument: isLoading.instrument || (isCompleting && currentSectionRef.current === 'instrument'),
    accounts: isLoading.accounts || (isCompleting && currentSectionRef.current === 'accounts'),
    timeOfDay: isLoading.timeOfDay || (isCompleting && currentSectionRef.current === 'timeOfDay')
  }

  const analyzeSection = useCallback(async (section: AnalysisSection, locale: string = 'en', timezone: string = 'UTC') => {
    // Set loading state first
    setLoading(section, true)
    setError(section, null)
    
    // Track the current section being analyzed
    currentSectionRef.current = section

    try {
      // Call the completion API
      const result = await complete('', {
        body: {
          section,
          locale,
          timezone
        }
      })
      
      // If the completion was successful but no onFinish was called, handle it here
      if (result && !getSectionData(section)) {
        setLoading(section, false)
        currentSectionRef.current = null
      }
    } catch (error) {
      console.error(`Error analyzing ${section}:`, error)
      setError(section, error instanceof Error ? error.message : 'Analysis failed')
      setLoading(section, false)
      currentSectionRef.current = null
    }
  }, [complete, setLoading, setError, getSectionData])

  // Enhanced function with retry logic and better error handling
  const analyzeSectionDirect = useCallback(async (section: AnalysisSection, locale: string = 'en', timezone: string = 'UTC', retryCount = 0) => {
    const maxRetries = 3
    const retryDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 10000) // Exponential backoff

    // Set loading state first
    setLoading(section, true)
    setError(section, null)

    try {
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      // Use safeFetch for better error handling
      const result = await safeFetch('/api/ai/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section,
          locale,
          timezone
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!result.success) {
        let errorMessage = result.error || 'Failed to get analysis'
        
        // Handle specific error types
        if (errorMessage.includes('HTTP 400')) {
          errorMessage = 'Invalid request parameters. Please refresh and try again.'
        } else if (errorMessage.includes('HTTP 401')) {
          errorMessage = 'Authentication required. Please log in again.'
        } else if (errorMessage.includes('HTTP 403')) {
          errorMessage = 'Access denied. Please check your permissions.'
        } else if (errorMessage.includes('HTTP 429')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.'
        } else if (errorMessage.includes('HTTP 5')) {
          errorMessage = 'Server error. Please try again in a few moments.'
        }
        
        throw new Error(errorMessage)
      }

      // Store the properly structured analysis data
      if (result.data) {
        setSectionData(section, result.data)
      } else {
        throw new Error('No analysis data received from server')
      }
    } catch (error) {
      console.error(`Error analyzing ${section} (attempt ${retryCount + 1}):`, error)
      
      // Handle different error types
      let errorMessage = 'Analysis failed. Please try again.'
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again.'
        } else if (error.message.includes('fetch')) {
          errorMessage = 'Network connection error. Please check your internet connection.'
        } else if (error.message.includes('TypeError')) {
          errorMessage = 'Connection error. Please refresh the page and try again.'
        } else {
          errorMessage = error.message
        }
      }

      // Retry logic for network errors
      if (retryCount < maxRetries && 
          (error instanceof Error && 
           (error.name === 'AbortError' || 
            error.message.includes('fetch') || 
            error.message.includes('Network') ||
            error.message.includes('HTTP error! status: 5')))) {
        
        console.log(`Retrying ${section} analysis in ${retryDelay(retryCount)}ms...`)
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay(retryCount)))
        
        // Recursive retry
        return analyzeSectionDirect(section, locale, timezone, retryCount + 1)
      }
      
      setError(section, errorMessage)
    } finally {
      setLoading(section, false)
    }
  }, [setLoading, setError, setSectionData])

  const analyzeAllSections = useCallback(async (locale: string = 'en', timezone: string = 'UTC') => {
    const sections: AnalysisSection[] = ['global', 'instrument', 'accounts', 'timeOfDay']
    
    // Analyze sections sequentially to avoid overwhelming the API
    for (const section of sections) {
      await analyzeSection(section, locale, timezone)
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }, [analyzeSection])

  return {
    // Actions
    analyzeSection,
    analyzeSectionDirect,
    analyzeAllSections,
    
    // State
    isLoading: combinedLoading,
    error,
    isCompleting,
    completionError,
    
    // Data
    getSectionData,
    getSummary,
    getLastUpdated,
    
    // Raw completion data (for debugging)
    completion
  }
} 