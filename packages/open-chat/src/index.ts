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
export default OpenChatComponent;
