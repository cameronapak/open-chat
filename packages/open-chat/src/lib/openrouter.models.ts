import { useQuery } from "@tanstack/react-query";
import { type ChatModelOption } from "../types/open-chat-component";

export type OpenRouterModel = {
  id: string;
  name: string;
  created?: number;
  description?: string;
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
    instruct_type?: string;
  };
  top_provider?: {
    is_moderated?: boolean;
    context_length?: number;
    max_completion_tokens?: number;
  };
  pricing?: {
    prompt?: string;
    completion?: string;
    image?: string;
    request?: string;
    web_search?: string;
    internal_reasoning?: string;
    input_cache_read?: string;
    input_cache_write?: string;
  };
  canonical_slug?: string;
  context_length?: number;
  hugging_face_id?: string;
  per_request_limits?: Record<string, unknown>;
  supported_parameters?: string[];
};

export type ModelsResponse = {
  data: OpenRouterModel[];
};

const CACHE_KEY = "openrouter_models_v1";
const makeCacheKey = (base: string) => `${CACHE_KEY}:${base || "default"}`;
export const MODELS_TTL_MS = 12 * 60 * 60 * 1000; // 12h

type CacheEntry = {
  ts: number;
  data: ModelsResponse;
};

function loadCache(base: string): ModelsResponse | null {
  try {
    const raw =
      typeof window !== "undefined" ? localStorage.getItem(makeCacheKey(base)) : null;
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (Date.now() - parsed.ts < MODELS_TTL_MS && parsed.data?.data) {
      return parsed.data;
    }
    return null;
  } catch {
    return null;
  }
}

function saveCache(base: string, data: ModelsResponse) {
  try {
    if (typeof window !== "undefined") {
      const entry: CacheEntry = { ts: Date.now(), data };
      localStorage.setItem(makeCacheKey(base), JSON.stringify(entry));
    }
  } catch {
    // ignore cache write errors
  }
};

const normalizeBaseUrl = (base?: string): string => {
  if (!base) return "";
  return base.replace(/\/$/, "");
};

export async function fetchModels(baseUrl: string): Promise<OpenRouterModel[]> {
  const resolvedBaseUrl = normalizeBaseUrl(baseUrl);
  const cacheKeyBase = resolvedBaseUrl;
  const cached = loadCache(cacheKeyBase);
  if (cached) {
    return cached.data;
  }

  const url = `${resolvedBaseUrl}/api/models`;
  const resp = await fetch(url, {
    credentials: "include",
    headers: {
      accept: "application/json",
    },
  });

  const text = await resp.text();
  let parsed: any = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    // fall through
  }

  if (!resp.ok) {
    const message = parsed?.error || parsed?.message || "Failed to fetch models";
    throw new Error(message);
  }

  const json = parsed as ModelsResponse;
  if (!json?.data || !Array.isArray(json.data)) {
    throw new Error("Invalid models response");
  }

  saveCache(cacheKeyBase, json);
  return json.data;
}

export function useOpenRouterModels(baseUrl: string) {
  return useQuery({
    queryKey: ["openrouter", "models"],
    queryFn: () => fetchModels(baseUrl),
    staleTime: MODELS_TTL_MS,
    gcTime: MODELS_TTL_MS * 2,
    retry: 1,
  });
}

const parsePrice = (value?: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export function mapOpenRouterModelToChatOption(model: OpenRouterModel): ChatModelOption {
  return {
    id: model.id,
    label: model.name ?? model.id,
    description: model.description,
    contextLength: model.context_length ?? model.top_provider?.context_length,
    promptCostPerToken: parsePrice(
      model.pricing?.prompt ??
        model.pricing?.request ??
        model.pricing?.web_search ??
        undefined,
    ),
    completionCostPerToken: parsePrice(model.pricing?.completion ?? model.pricing?.web_search ?? undefined),
    metadata: {
      raw: model,
    },
  };
}

export async function fetchOpenRouterModelOptions(baseUrl: string): Promise<ChatModelOption[]> {
  const modelsList = await fetchModels(baseUrl);
  return modelsList.map(mapOpenRouterModelToChatOption);
}

export function useOpenRouterModelOptions(baseUrl: string) {
  return useQuery({
    queryKey: ["openrouter", "model-options"],
    queryFn: () => fetchOpenRouterModelOptions(baseUrl),
    staleTime: MODELS_TTL_MS,
    gcTime: MODELS_TTL_MS * 2,
    retry: 1,
  });
}
