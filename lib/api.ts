// lib/api.ts
import { LegalPrompt, PaginationInfo, PromptData, PromptsResponse } from './types'
import { validateRequiredFields, validateFieldLengths, sanitizePromptData } from './validation'

interface ErrorResponse {
  error: string
  details?: Record<string, string | null>
}

export class ApiError extends Error {
  public details?: Record<string, string | null>
  public status: number

  constructor(message: string, status: number, details?: Record<string, string | null>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

// Simplified response validation - only checking structure, not content
function validateApiResponse(data: any): data is PromptsResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray(data.prompts) &&
    typeof data.pagination === 'object' &&
    data.pagination !== null &&
    typeof data.pagination.total === 'number' &&
    typeof data.pagination.page === 'number' &&
    typeof data.pagination.limit === 'number' &&
    typeof data.pagination.totalPages === 'number'
  )
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      errorData.error || 'An error occurred',
      response.status,
      errorData.details
    )
  }

  try {
    const data = await response.json()
    return data as T
  } catch (error) {
    throw new ApiError(
      'Failed to parse response',
      500,
      { parseError: error instanceof Error ? error.message : 'Unknown error' }
    )
  }
}

export async function fetchPrompts(
  page: number = 1,
  limit: number = 10,
  category?: string
): Promise<PromptsResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(category && category !== 'all' ? { category } : {})
    })

    const response = await fetch(`/api/prompts?${params}`)
    const data = await handleResponse<PromptsResponse>(response)

    if (!validateApiResponse(data)) {
      throw new ApiError('Invalid response format', 500)
    }

    // Transform dates if needed
    data.prompts = data.prompts.map(prompt => ({
      ...prompt,
      createdAt: new Date(prompt.createdAt),
    }))

    return data
  } catch (error) {
    console.error('Error in fetchPrompts:', error)
    if (error instanceof ApiError) throw error
    throw new ApiError('Failed to fetch prompts', 500)
  }
}

export async function addCustomPrompt(promptData: PromptData): Promise<LegalPrompt> {
  // Validate input using validation.ts functions
  const { hasErrors: hasMissingFields, missingFields } = validateRequiredFields(promptData)
  if (hasMissingFields) {
    throw new ApiError('Missing required fields', 400, missingFields)
  }

  const { hasErrors: hasLengthErrors, invalidLengths } = validateFieldLengths(promptData)
  if (hasLengthErrors) {
    throw new ApiError('Invalid field lengths', 400, invalidLengths)
  }

  // Sanitize input
  const sanitizedData = sanitizePromptData(promptData)

  try {
    const response = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedData),
    })

    const data = await handleResponse<{ prompt: LegalPrompt }>(response)
    return {
      ...data.prompt,
      createdAt: new Date(data.prompt.createdAt),
    }
  } catch (error) {
    console.error('Error in addCustomPrompt:', error)
    if (error instanceof ApiError) throw error
    throw new ApiError('Failed to add prompt', 500)
  }
}

export async function updatePrompt(
  id: number,
  promptData: Partial<PromptData>
): Promise<LegalPrompt> {
  try {
    const response = await fetch(`/api/prompts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promptData),
    })

    const data = await handleResponse<{ prompt: LegalPrompt }>(response)
    return {
      ...data.prompt,
      createdAt: new Date(data.prompt.createdAt),
    }
  } catch (error) {
    console.error('Error in updatePrompt:', error)
    if (error instanceof ApiError) throw error
    throw new ApiError('Failed to update prompt', 500)
  }
}

export async function removePrompt(id: number): Promise<void> {
  try {
    const response = await fetch(`/api/prompts/${id}`, {
      method: 'DELETE',
    })
    await handleResponse<{ message: string }>(response)
  } catch (error) {
    console.error('Error in removePrompt:', error)
    if (error instanceof ApiError) throw error
    throw new ApiError('Failed to remove prompt', 500)
  }
}