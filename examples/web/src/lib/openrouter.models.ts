import { useQuery } from "@tanstack/react-query";

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
export const MODELS_TTL_MS = 12 * 60 * 60 * 1000; // 12h

type CacheEntry = {
  ts: number;
  data: ModelsResponse;
};

function loadCache(): ModelsResponse | null {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(CACHE_KEY) : null;
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

function saveCache(data: ModelsResponse) {
  try {
    if (typeof window !== "undefined") {
      const entry: CacheEntry = { ts: Date.now(), data };
      localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    }
  } catch {
    // ignore cache write errors
  }
}

export async function fetchModels(baseUrl = import.meta.env.VITE_SERVER_URL as string): Promise<OpenRouterModel[]> {
  const cached = loadCache();
  if (cached) {
    return cached.data;
  }

  const url = `${(baseUrl ?? "").replace(/\/$/, "")}/api/models`;
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

  saveCache(json);
  return json.data;
}

export function useOpenRouterModels() {
  return useQuery({
    queryKey: ["openrouter", "models"],
    queryFn: () => fetchModels(),
    staleTime: MODELS_TTL_MS,
    gcTime: MODELS_TTL_MS * 2,
    retry: 1,
  });
}