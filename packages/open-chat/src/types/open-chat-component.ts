import { type UIMessage, type UseChatOptions } from "@ai-sdk/react";
import { type ReactNode } from "react";
import type { UseMcpOptions } from "../hooks/use-mcp.types";
import type { AuthState, PreparedAuthInjection } from "../lib/auth/types";

/**
 * User profile for providing context in the chat.
 */
interface UserProfile {
	/** User's display name. */
	nickname: string;
	/** Optional chat preferences, e.g., as a JSON string. */
	chatPreferences?: string;
	/** Optional URL for user's avatar image. */
	avatarUrl?: string;
}

/**
 * Configuration for enabling and configuring MCP tools.
 */
interface ToolsConfig {
	/** Whether to enable tools and MCP integration (default: true). */
	enabled?: boolean;
	/** Array of MCP server configurations using project hook types. */
	mcpServers?: UseMcpOptions[];
}

export type Resolvable<T> = T | (() => T | Promise<T>);

export type ResolvableRecord = Resolvable<Record<string, string> | Headers>;

export interface ProviderCapabilities {
	/** Toggle to indicate if real-time web search is supported (default: off). */
	webSearch?: boolean;
	/** Toggle to indicate if advanced reasoning should be requested (default: off). */
	reasoning?: boolean;
}

export interface ProviderMeta {
	/** Friendly provider name for UI copy. */
	name?: string;
	/** Optional avatar or logo rendered alongside integrations. */
	brandingAvatar?: ReactNode;
	/** Optional call-to-action rendered with the auth message when auth is required. */
	authCTA?: ReactNode;
	/** Optional label used for the web search integration toggle. */
	webSearchLabel?: string;
	/** Optional helper text shown under the web search integration toggle. */
	webSearchDescription?: string;
}

export interface EndpointConfig {
	/** Base URL for the target AI endpoint (e.g. OpenAI-compatible gateway). */
	baseUrl: string;
	/** Model identifier understood by the target endpoint. */
	model: string;
	/** Optional provider identifier used when creating custom providers. */
	providerId?: string;
	/** Optional API key helper. If provided, the Authorization header will be managed automatically. */
	apiKey?: Resolvable<string | undefined>;
	/** Optional static or lazy headers appended to each request. */
	headers?: ResolvableRecord;
	/** Optional query string parameters appended to each request. */
	query?: Record<string, string>;
}

/**
 * Definition for externally provided model options.
 */
export interface ChatModelOption {
	/** Unique model identifier (e.g., openrouter slug). */
	id: string;
	/** Friendly label to display in the selector. */
	label: string;
	/** Optional detailed description shown in tooltips or UI. */
	description?: string;
	/** Maximum context length supported by the model. */
	contextLength?: number;
	/** Prompt-side cost per token in USD cents (or raw units), if known. */
	promptCostPerToken?: number;
	/** Completion-side cost per token in USD cents (or raw units), if known. */
	completionCostPerToken?: number;
	/** Optional metadata bag for advanced consumers. */
	metadata?: Record<string, unknown>;
}

/**
 * Props interface for the OpenChatComponent.
 * 
 * This defines a standalone, drop-in React component for AI-powered chat
 * integrated with AI SDK runtimes and optional MCP tooling. Designed for POC simplicity:
 * most props optional with sensible defaults aligned to project env (e.g., api uses VITE_SERVER_URL).
 * 
 * Usage example:
 * ```tsx
 * <OpenChatComponent
 *   modelId="my-provider/model"
 *   initialMessages={messages}
 *   tools={{ enabled: true, mcpServers: [...] }}
 * />
 * ```
 */
export interface OpenChatComponentProps {
	// AI/Backend Configuration
	/**
	 * Optional endpoint configuration for bypassing the bundled proxy.
	 * When provided, the component will talk directly to the specified endpoint using client-side transports.
	 */
	endpointConfig?: EndpointConfig;
	/**
	 * Model ID to use for the chat (default: project default model).
	 * Example: 'openai/gpt-5' or 'anthropic/claude-3.5-sonnet'.
	 */
	modelId?: string;
	/**
	 * API endpoint for AI SDK-compatible LLM chat requests
	 */
	api: string;
	/**
	 * Additional configuration to pass directly into the underlying useChat hook.
	 * Defaults are merged first so OpenChat behaviour (transport, MCP wiring) stays intact.
	 */
	useChatOptions?: UseChatOptions<UIMessage>;
	/**
	 * Initial system prompt to set conversation context.
	 * Sent as the first message in the thread.
	 */
	systemPrompt?: string;

	// Conversation State
	/**
	 * Unique ID for the conversation thread.
	 * Used for persisting/retrieving messages server-side.
	 */
	threadId?: string;
	/**
	 * Array of initial messages to populate the chat.
	 * Uses AI SDK's UIMessage type for compatibility with useChat hook.
	 */
	initialMessages?: UIMessage[];

	// UI and Layout
	/**
	 * Placeholder text for the input field (default: 'Ask OpenChat...').
	 */
	placeholder?: string;
	/**
	 * CSS class name for the root component element.
	 * Allows custom styling with Tailwind/shadcn.
	 */
	className?: string;
	/**
	 * Height of the chat container (default: 'auto').
	 * Can be string (e.g., '500px', '100vh') or number (pixels).
	 */
	height?: string | number;

	// Tools and MCP Integration
	/**
	 * Configuration for tools, including MCP servers.
	 * Enables tool calls in the AI conversation.
	 */
	tools?: ToolsConfig;
	/**
	 * URL for the MCP registry (default: 'https://registry.modelcontextprotocol.io').
	 * Used to discover and connect MCP servers dynamically.
	 */
	mcpRegistryUrl?: string;

	// User Context
	/**
	 * Optional user profile to personalize the chat.
	 * Can influence AI responses or UI (e.g., avatar display).
	 */
	userProfile?: UserProfile;

	// Event Callbacks
	/**
	 * Callback fired when a new message is added to the conversation.
	 * Useful for parent component to sync state or save to DB.
	 */
	onNewMessage?: (message: UIMessage) => void;
	/**
	 * Callback for handling errors (e.g., API failure, tool call error).
	 * Allows logging or user notification.
	 */
	onError?: (error: Error) => void;
	/**
	 * Callback when user submits a message.
	 * For custom handling before sending to AI.
	 */
	onSend?: (text: string) => void | Promise<void>;

	// Customization and Composition
	/**
	 * Theme mode (default: 'light' or from ThemeProvider context).
	 * Supports 'light' | 'dark' for shadcn/ui compatibility.
	 */
	theme?: 'light' | 'dark';
	/**
	 * If true, the component will require the user to complete authentication before chatting.
	 * (default: false)
	 */
	requireAuth?: boolean;
	/**
	 * Optional injected auth state. When provided with {@link requireAuth}, the component only enables sending when {@link authState.ready} is true.
	 */
	authState?: AuthState;
	/**
	 * Optional custom message shown when authentication is required. Falls back to authState.message or a generic prompt.
	 */
	authMessage?: string;
	/**
	 * Optional hook to prepare auth-per-request headers/body. Called before sending when provided.
	 */
	prepareAuthRequest?: () => Promise<PreparedAuthInjection | void>;
	/**
	 * Optional provider capabilities used to toggle feature affordances (e.g., web search, reasoning).
	 */
	capabilities?: ProviderCapabilities;
	/**
	 * Optional provider branding and UI metadata.
	 */
	providerMeta?: ProviderMeta;
	/**
	 * An array of allowed model IDs. If provided, the model selection dropdown will only show these models.
	 * Example: ['openai/gpt-5', 'anthropic/claude-3-opus'].
	 */
	allowedModels?: string[];
	/**
	 * Custom render function for individual message parts.
	 * If provided, this function will be called for each message part. If it returns a ReactNode,
	 * that will be rendered. If it returns null, the default rendering will be used.
	 */
	renderMessage?: (message: UIMessage, part: any, index: number) => React.ReactNode | null;
	/**
	 * External set of model options available to the component. When omitted, the selector will be hidden.
	 */
	models?: ChatModelOption[];
	/**
	 * Loading state for the external model fetch.
	 */
	modelsLoading?: boolean;
	/**
	 * Error message to display when fetching models fails.
	 */
	modelsError?: string;
	/**
	 * Notifies parent components whenever the active model changes.
	 */
	onModelChange?: (modelId: string) => void;
}
