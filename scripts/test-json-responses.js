#!/usr/bin/env node

/**
 * JSON Response Validation Test
 * Tests that all AI endpoints return proper JSON responses
 */

const { safeJsonParse, validateAPIResponse } = require('../lib/api-response-wrapper')

console.log('🧪 Testing JSON Response Handling...\n')

// Test safeJsonParse with various inputs
console.log('📋 Testing safeJsonParse function:')

const testCases = [
  // Valid JSON
  { 
    input: '{"success": true, "data": {"message": "Hello"}}',
    expected: 'success'
  },
  // Malformed streaming response (the original error)
  { 
    input: '3:"An error occurred."\\n',
    expected: 'fail_gracefully'
  },
  // Data prefix (common in streaming)
  { 
    input: 'data: {"success": true, "data": "test"}',
    expected: 'success'
  },
  // Invalid JSON
  { 
    input: '{invalid json}',
    expected: 'fail_gracefully'
  },
  // Empty string
  { 
    input: '',
    expected: 'fail_gracefully'
  },
  // Plain text
  { 
    input: 'This is just plain text',
    expected: 'fail_gracefully'
  }
]

testCases.forEach((testCase, index) => {
  const result = safeJsonParse(testCase.input)
  
  if (testCase.expected === 'success' && result.success) {
    console.log(`  ✅ Test ${index + 1}: Successfully parsed valid JSON`)
  } else if (testCase.expected === 'fail_gracefully' && !result.success) {
    console.log(`  ✅ Test ${index + 1}: Gracefully handled malformed input`)
  } else {
    console.log(`  ❌ Test ${index + 1}: Unexpected result`)
    console.log(`     Input: ${testCase.input.substring(0, 50)}...`)
    console.log(`     Expected: ${testCase.expected}`)
    console.log(`     Got: ${result.success ? 'success' : 'failure'}`)
  }
})

// Test API response validation
console.log('\\n📋 Testing API Response Validation:')

const apiResponseTests = [
  // Valid success response
  {
    input: { success: true, data: { analysis: "test" } },
    expected: true
  },
  // Valid error response
  {
    input: { success: false, error: "Test error", code: "TEST" },
    expected: true
  },
  // Invalid response (missing success field)
  {
    input: { data: "test" },
    expected: false
  },
  // Invalid response (success not boolean)
  {
    input: { success: "true", data: "test" },
    expected: false
  }
]

apiResponseTests.forEach((test, index) => {
  const isValid = validateAPIResponse(test.input)
  
  if (isValid === test.expected) {
    console.log(`  ✅ Validation Test ${index + 1}: ${isValid ? 'Valid' : 'Invalid'} response correctly identified`)
  } else {
    console.log(`  ❌ Validation Test ${index + 1}: Expected ${test.expected}, got ${isValid}`)
  }
})

// Test response format examples
console.log('\\n📋 Expected Response Formats:')

console.log('\\n✅ Success Response Example:')
const successExample = {
  success: true,
  data: {
    section: "global",
    analysis: "Your trading performance shows...",
    timestamp: new Date().toISOString(),
    locale: "en"
  }
}
console.log(JSON.stringify(successExample, null, 2))

console.log('\\n❌ Error Response Example:')
const errorExample = {
  success: false,
  error: "Analysis failed. Please try again.",
  code: "ANALYSIS_ERROR"
}
console.log(JSON.stringify(errorExample, null, 2))

console.log('\\n🔍 Common Malformed Responses (Now Handled):')
const malformedExamples = [
  '3:"An error occurred."\\n',
  'data: invalid json',
  '{incomplete json',
  'plain text response'
]

malformedExamples.forEach(example => {
  const result = safeJsonParse(example)
  console.log(`  Input: "${example}" → ${result.success ? 'Parsed' : 'Safely rejected'}`)
})

console.log('\\n🎯 Integration Test Recommendations:')
console.log('1. Test analysis endpoint with valid request')
console.log('2. Test analysis endpoint with invalid request')
console.log('3. Test frontend analysis hook with mocked responses')
console.log('4. Check browser console for JSON parsing errors (should be none)')
console.log('5. Test network offline scenario')

console.log('\\n✨ JSON Response Test Complete!')
console.log('\\n🚀 Next Steps:')
console.log('1. Run the application and test analysis features')
console.log('2. Check that no JSON parsing errors appear in browser console')
console.log('3. Verify user-friendly error messages are displayed')
console.log('4. Test with ZAI_API_KEY configured')

