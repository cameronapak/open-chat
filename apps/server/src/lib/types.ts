import { type } from 'arktype'

export const OpenRouterModel = type({
  id: 'string',
  canonical_slug: 'string',
  hugging_face_id: 'string',
  name: 'string',
  created: 'number',
  description: 'string',
  context_length: 'number',
  architecture: {
    modality: 'string',
    input_modalities: 'string[]',
    output_modalities: 'string[]',
    tokenizer: 'string',
    instruct_type: 'string | null'
  },
  pricing: {
    prompt: 'string',
    completion: 'string',
    request: 'string',
    image: 'string',
    web_search: 'string',
    internal_reasoning: 'string',
    input_cache_read: 'string | undefined',
    input_cache_write: 'string | undefined'
  },
  top_provider: {
    context_length: 'number',
    max_completion_tokens: 'number | null',
    is_moderated: 'boolean'
  },
  per_request_limits: 'null',
  supported_parameters: 'string[]'
})

export const OpenRouterModelsResponse = type({
  data: OpenRouterModel.array()
})

export type OpenRouterModelType = typeof OpenRouterModel.infer
export type OpenRouterModelsResponseType = typeof OpenRouterModelsResponse.infer