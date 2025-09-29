import { type UIMessage } from '@ai-sdk/react';
import type { UseMcpOptions } from '../hooks/use-mcp.types';

/**
 * User profile for providing context in the chat.
 */
interface UserProfile {
  /** User's display name. */
  nickname: string;
  /** Optional chat preferences, e.g., as a JSON string. */
  chatPreferences?: string;
  /** Optional URL for user's avatar image. */
  avatarUrl?: URL;
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

/**
 * Props interface for the OpenChatComponent.
 * 
 * This defines a standalone, drop-in React component for AI-powered chat
 * integrated with OpenRouter, AI SDK, and MCP tools. Designed for POC simplicity:
 * most props optional with sensible defaults aligned to project env (e.g., api uses VITE_SERVER_URL).
 * 
 * Usage example:
 * ```tsx
 * <OpenChatComponent
 *   openRouterModel="openai/gpt-4o"
 *   initialMessages={messages}
 *   tools={{ enabled: true, mcpServers: [...] }}
 * />
 * ```
 */
export interface OpenChatComponentProps {
  // AI/Backend Configuration
  /**
   * OpenRouter model ID to use for the chat (default: project default model).
   * Example: 'openai/gpt-4o' or 'anthropic/claude-3.5-sonnet'.
   */
  openRouterModel?: string;
  /**
   * API endpoint for AI SDK requests (default: process.env.VITE_SERVER_URL).
   * Points to the backend Hono API for chat handling.
   */
  api?: string;
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
  mcpRegistryUrl?: URL;

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
}