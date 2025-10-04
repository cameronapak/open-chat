import type { UIMessage } from '@ai-sdk/react'
import r2wc from '@r2wc/react-to-web-component'
import OpenChatComponent from './components/open-chat-component'
import type { OpenChatComponentProps } from './types/open-chat-component'
import { createElement } from 'react'

type MaybeString = string | undefined | null

const NUMERIC_STRING_REGEX = /^\d+$/

const normalizeHeight = (height: OpenChatComponentProps['height']): OpenChatComponentProps['height'] => {
  if (typeof height === 'string') {
    const trimmed = height.trim()
    if (NUMERIC_STRING_REGEX.test(trimmed)) {
      const numeric = Number(trimmed)
      if (!Number.isNaN(numeric)) {
        return numeric
      }
    }
  }
  return height
}

const normalizeMessages = (messages?: UIMessage[]): UIMessage[] | undefined => {
  if (!messages) return undefined
  return Array.isArray(messages) ? messages : undefined
}

const WebComponentAdapter = (props: OpenChatComponentProps & Record<string, unknown>) => {
  const { height, initialMessages, className, ...rest } = props

  const fallbackClassName =
    typeof props.class === 'string'
      ? (props.class as string)
      : typeof props['class-name'] === 'string'
        ? (props['class-name'] as string)
        : undefined

  const resolvedHeight = normalizeHeight(height)
  const resolvedMessages = normalizeMessages(initialMessages)

  return createElement(OpenChatComponent, {
    ...rest,
    className: className ?? fallbackClassName,
    height: resolvedHeight,
    initialMessages: resolvedMessages,
  })
}

const propTypes = {
  openRouterModel: 'string',
  api: 'string',
  systemPrompt: 'string',
  threadId: 'string',
  placeholder: 'string',
  className: 'string',
  height: 'string',
  theme: 'string',
  requireAuth: 'boolean',
  initialMessages: 'json',
  allowedModels: 'json',
  tools: 'json',
  mcpRegistryUrl: 'string',
  userProfile: 'json',
} as const

const eventOptions = {
  onNewMessage: { bubbles: true, composed: true },
  onSend: { bubbles: true, composed: true },
  onError: { bubbles: true, composed: true },
} as const

type CreateOpenChatElementOptions = {
  shadow?: ShadowRootMode
}

const createOpenChatElement = ({ shadow }: CreateOpenChatElementOptions = {}) =>
  r2wc(WebComponentAdapter, {
    props: propTypes,
    events: eventOptions,
    shadow,
  })

const OpenChatElement = createOpenChatElement()

export interface DefineOpenChatElementOptions {
  tagName?: string
  shadow?: ShadowRootMode
}

export const defineOpenChatElement = ({
  tagName = 'open-chat',
  shadow,
}: DefineOpenChatElementOptions = {}) => {
  const Element = shadow ? createOpenChatElement({ shadow }) : OpenChatElement

  if (typeof window === 'undefined' || typeof customElements === 'undefined') {
    return Element
  }

  if (!customElements.get(tagName)) {
    customElements.define(tagName, Element)
  }

  return Element
}

export default OpenChatElement