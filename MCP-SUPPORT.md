## MCP Support

Most likely MCP's will be called "Connectors" on the client-side.

- [x] Enable remote `streamable-http` type MCP's
- [ ] Enable remote `sse` type MCP's
- Locally machine-run MCP packages are not supported at this time
- [x] I can enable an MCP to be used in chat
- [ ] I can remove an MCP from my list of MCP's
- [ ] I can OAuth into an MCP
- [ ] I can add an API Key to an MCP

## MCP Registry

- [x] I can get the list of servers from the Official MCP registry
- [x] I can connect to an MCP server from the official registry
- [ ] I can filter / sort the Official MCP registry
- [ ] I can add a custom MCP subregistry
- [ ] I can filter / sort the custom MCP subregistry

## Custom MCP's

- [x] I can manually add a remote `streamable-http` type MCP
- [ ] I can manually add an remote `sse` type MCP
- [ ] I can add an API Key to my custom MCP (otherwise, if auth'd it'll kick to OAuth)

## Prompts

- [ ] I can receive [prompts](https://modelcontextprotocol.io/specification/2025-06-18/server/prompts) from an MCP
- [ ] In the web client, I can use prompts from MCP's

## Web Client

Too many tools connected at the same time makes it very hard for the LLM to know which one to choose. 

- [ ] For every chat, I must manually toggle which Connectors to use. 
- [ ] I can tell a connector to always be used in chat
- [ ] Given I save/install an MCP on the client, I must validate the server connection before actually saving it.
