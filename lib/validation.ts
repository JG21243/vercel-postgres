
// lib/validation.ts
export interface PromptData {
    name: string
    prompt: string
    category: string
  }
  
  export interface PaginationParams {
    page: number
    limit: number
    category?: string
  }
  
  export const FIELD_LIMITS = {
    name: 100,
    prompt: 5000,
    category: 50
  } as const
  
  export const DEFAULT_PAGINATION = {
    page: 1,
    limit: 10
  } as const
  
  export function validateRequiredFields(data: Partial<PromptData>) {
    const missingFields = {
      name: !data.name?.trim() ? 'Name is required' : null,
      prompt: !data.prompt?.trim() ? 'Prompt is required' : null,
      category: !data.category?.trim() ? 'Category is required' : null
    }
  
    const hasErrors = Object.values(missingFields).some(field => field !== null)
    return { hasErrors, missingFields }
  }
  
  export function validateFieldLengths(data: PromptData) {
    const invalidLengths = {
      name: data.name.length > FIELD_LIMITS.name 
        ? `Name must be ${FIELD_LIMITS.name} characters or less` 
        : null,
      prompt: data.prompt.length > FIELD_LIMITS.prompt 
        ? `Prompt must be ${FIELD_LIMITS.prompt} characters or less` 
        : null,
      category: data.category.length > FIELD_LIMITS.category 
        ? `Category must be ${FIELD_LIMITS.category} characters or less` 
        : null
    }
  
    const hasErrors = Object.values(invalidLengths).some(field => field !== null)
    return { hasErrors, invalidLengths }
  }
  
  export function sanitizePromptData(data: PromptData): PromptData {
    return {
      name: data.name.trim(),
      prompt: data.prompt.trim(),
      category: data.category.trim()
    }
  }
  
  export function getPaginationParams(searchParams: URLSearchParams): PaginationParams {
    return {
      page: Math.max(1, parseInt(searchParams.get('page') || '1')),
      limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10'))),
      category: searchParams.get('category') || undefined
    }
  }
  