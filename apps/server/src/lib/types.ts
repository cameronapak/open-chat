import { z } from 'zod'

export const OpenRouterModel = z.object({
  id: z.string(),
  canonical_slug: z.string().nullable(),
  hugging_face_id: z.string().nullable(),
  name: z.string(),
  created: z.number(),
  description: z.string(),
  context_length: z.number().optional(),
  architecture: z.object({
    modality: z.string(),
    input_modalities: z.string().array(),
    output_modalities: z.string().array(),
    tokenizer: z.string(),
    instruct_type: z.string().nullable()
  }),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
    request: z.string(),
    image: z.string(),
    web_search: z.string().optional(),
    internal_reasoning: z.string().optional(),
    input_cache_read: z.string().optional(),
    input_cache_write: z.string().optional()
  }),
  top_provider: z.object({
    context_length: z.number(),
    max_completion_tokens: z.number().nullable(),
    is_moderated: z.boolean()
  }),
  per_request_limits: z.object().optional(),
  supported_parameters: z.string().array().nullable()
})

export const OpenRouterModelsResponse = z.object({
  data: OpenRouterModel.array()
})

export type OpenRouterModelType = z.infer<typeof OpenRouterModel>;
export type OpenRouterModelsResponseType = z.infer<typeof OpenRouterModelsResponse>;
