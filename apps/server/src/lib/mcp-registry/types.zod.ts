/**
 * {@see https://registry.modelcontextprotocol.io/docs}
 */

import { z } from 'zod';

// RegistryExtensions schema
export const RegistryExtensionsSchema = z.object({
  serverId: z.string(),
  versionId: z.string(),
  publishedAt: z.string(),
  updatedAt: z.string().optional(),
  isLatest: z.boolean(),
});

// ServerMeta schema
export const ServerMetaSchema = z.object({
  "io.modelcontextprotocol.registry/official": RegistryExtensionsSchema,
  "io.modelcontextprotocol.registry/publisher-provided": z.record(z.string(), z.any()),
}).partial();

// Input schema (using the second definition with camelCase properties)
export const InputSchema = z.object({
  choices: z.array(z.string()).nullable().optional(),
  default: z.string().optional(),
  description: z.string().optional(),
  format: z.string().optional(),
  isRequired: z.boolean().optional(),
  isSecret: z.boolean().optional(),
  value: z.string().optional(),
});

// KeyValueInput schema
export const KeyValueInputSchema = z.object({
  choices: z.array(z.string()).nullable().optional(),
  default: z.string().optional(),
  description: z.string().optional(),
  format: z.string().optional(),
  isRequired: z.boolean().optional(),
  isSecret: z.boolean().optional(),
  name: z.string(),
  value: z.string().optional(),
  variables: z.object({
    choices: z.array(z.string()).nullable().optional(),
    default: z.string().optional(),
    description: z.string().optional(),
    format: z.string().optional(),
    isRequired: z.boolean().optional(),
    isSecret: z.boolean().optional(),
    name: z.string(),
    value: z.string().optional()
  })
});

// PingBody schema
export const PingBodySchema = z.object({
  pong: z.boolean(),
});

// Transport schema
export const TransportSchema = z.object({
  type: z.string(),
  url: z.string(),
  headers: z.array(InputSchema).optional(),
});

// Package schema
export const PackageSchema = z.object({
  environment_variables: z.array(InputSchema).optional().nullable(),
  file_sha256: z.string().optional(),
  identifier: z.string(),
  package_arguments: z.array(InputSchema).optional().nullable(),
  registry_base_url: z.string().optional(),
  registry_type: z.string(),
  runtime_arguments: z.array(InputSchema).optional().nullable(),
  runtime_hint: z.string().optional(),
  transport: TransportSchema.optional(),
  version: z.string(),
});

// Remote schema
export const RemoteSchema = z.object({
  type: z.string(),
  url: z.string(),
  headers: z.array(InputSchema).optional(),
});

// Repository schema
export const RepositorySchema = z.object({
  id: z.string(),
  source: z.string(),
  subfolder: z.string().optional(),
  url: z.string(),
});

// Server schema
export const ServerSchema = z.object({
  $schema: z.string().optional(),
  name: z.string(),
  description: z.string(),
  status: z.string().optional(),
  repository: RepositorySchema.optional(),
  version: z.string(),
  websiteUrl: z.string().optional(),
  packages: z.array(PackageSchema).nullable().optional(),
  remotes: z.array(RemoteSchema).nullable().optional(),
  _meta: ServerMetaSchema.optional(),
});

// Metadata schema
export const MetadataSchema = z.object({
  next_cursor: z.string().optional(),
  count: z.number(),
});

// ServerListResponse schema
export const ServerListResponseSchema = z.object({
  servers: z.array(ServerSchema),
  metadata: MetadataSchema,
});

// ListServersOptions schema
export const ListServersOptionsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
  updated_since: z.string().optional(),
  version: z.string().optional(),
});

// GitHubTokenExchangeInputBody schema
export const GitHubTokenExchangeInputBodySchema = z.object({
  github_token: z.string(),
});

// TokenResponse schema
export const TokenResponseSchema = z.object({
  expires_at: z.number(),
  registry_token: z.string(),
});

// GitHubOIDCTokenExchangeInputBody schema
export const GitHubOIDCTokenExchangeInputBodySchema = z.object({
  oidc_token: z.string(),
});

// HTTPTokenExchangeInputBody schema
export const HTTPTokenExchangeInputBodySchema = z.object({
  domain: z.string(),
  signed_timestamp: z.string(),
  timestamp: z.string(),
});

// OIDCTokenExchangeInputBody schema
export const OIDCTokenExchangeInputBodySchema = z.object({
  oidc_token: z.string(),
});

// DNSTokenExchangeInputBody schema
export const DNSTokenExchangeInputBodySchema = z.object({
  domain: z.string(),
  signed_timestamp: z.string(),
  timestamp: z.string(),
});

// HealthBody schema
export const HealthBodySchema = z.object({
  github_client_id: z.string().optional(),
  status: z.string(),
});

// ErrorDetail schema
export const ErrorDetailSchema = z.object({
  location: z.string(),
  message: z.string(),
  value: z.any(),
});

// ErrorModel schema
export const ErrorModelSchema = z.object({
  detail: z.string(),
  errors: z.array(ErrorDetailSchema).nullable(),
  instance: z.string(),
  status: z.number(),
  title: z.string(),
  type: z.string(),
});

// Type definitions for reference
export type RegistryExtensions = z.infer<typeof RegistryExtensionsSchema>;
export type ServerMeta = z.infer<typeof ServerMetaSchema>;
export type Input = z.infer<typeof InputSchema>;
export type KeyValueInput = z.infer<typeof KeyValueInputSchema>;
export type PingBody = z.infer<typeof PingBodySchema>;
export type Transport = z.infer<typeof TransportSchema>;
export type Package = z.infer<typeof PackageSchema>;
export type Remote = z.infer<typeof RemoteSchema>;
export type Repository = z.infer<typeof RepositorySchema>;
export type Server = z.infer<typeof ServerSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type ServerListResponse = z.infer<typeof ServerListResponseSchema>;
export type ListServersOptions = z.infer<typeof ListServersOptionsSchema>;
export type GitHubTokenExchangeInputBody = z.infer<typeof GitHubTokenExchangeInputBodySchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
export type GitHubOIDCTokenExchangeInputBody = z.infer<typeof GitHubOIDCTokenExchangeInputBodySchema>;
export type HTTPTokenExchangeInputBody = z.infer<typeof HTTPTokenExchangeInputBodySchema>;
export type OIDCTokenExchangeInputBody = z.infer<typeof OIDCTokenExchangeInputBodySchema>;
export type DNSTokenExchangeInputBody = z.infer<typeof DNSTokenExchangeInputBodySchema>;
export type HealthBody = z.infer<typeof HealthBodySchema>;
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;
export type ErrorModel = z.infer<typeof ErrorModelSchema>;
