import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import type { StreamableHTTPClientTransportOptions } from "@modelcontextprotocol/sdk/client/streamableHttp";

export class MCPClient {
  private mcpServerUrl: URL;
  private mcp: Client;
  private transport: StreamableHTTPClientTransport | null = null;
  private transportOptions: StreamableHTTPClientTransportOptions = {};

  constructor({
    mcpServerUrl,
    name,
    version,
    transportOptions = {}
  }: {
    mcpServerUrl: URL,
    /** Name of the MCP Client */
    name: string,
    /** @example "0.0.1" */
    version: string,
    /** Configuration options for the StreamableHTTPClientTransport */
    transportOptions?: StreamableHTTPClientTransportOptions
  }) {
    this.mcp = new Client({ name, version });
    this.transportOptions = transportOptions;
    this.mcpServerUrl = mcpServerUrl;
  }

  async connect() {
    this.transport = new StreamableHTTPClientTransport(this.mcpServerUrl, this.transportOptions);
    await this.mcp.connect(this.transport);
  }

  get client() {
    return this.mcp;
  }
}
