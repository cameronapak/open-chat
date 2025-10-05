import OpenChatComponent from "@/components/open-chat-component";
export type {
  OpenChatComponentProps,
  ChatModelOption,
} from "@/types/open-chat-component";
export {
  fetchOpenRouterModelOptions,
  mapOpenRouterModelToChatOption,
  useOpenRouterModelOptions,
} from "@/lib/openrouter.models";
export {
  createOpenRouterOAuthClient,
  normalizeOpenRouterBaseUrl,
} from "./lib/auth/create-openrouter-oauth-client";
export { useOpenRouterAuth } from "./lib/auth/use-openrouter-auth";
export type {
  OpenRouterOAuthClient,
  OpenRouterOAuthClientOptions,
  OpenRouterOAuthStartResult,
  OpenRouterOAuthStatus,
  OpenRouterOAuthStatusResult,
  UseOpenRouterAuthOptions,
  UseOpenRouterAuthReturn,
} from "./lib/auth/types";
export default OpenChatComponent;
