An ongoing list of todos for this project:

- [x] Sort alphabetically the OpenRouter models 
- [x] Show if a model is free or if it costs
- [x] temp: rm add photos or videos
- [ ] Host this app
- [x] Dynamically show internet search based on if the model supports it (turns out any model does...)
- [ ] Add info about [Open Inference](https://www.openinference.xyz/) into the settings dialog
- [ ] Add a trash can to be able to delete a specific thread
- [ ] Save threads in local storage
- [x] Add reasoning component
- [ ] Allow theme CSS variables for the component
- [ ] [Add MCP tool support](./MCP-SUPPORT.md)
  - [AuthKit from Pica](https://docs.picaos.com/core/authkit) seems like a wonderful contender for a MCP tool app store.
  - [Official MCP Registry](https://mcp-registry.val.run/)
  - I could create a faith.tools MCP Registry using the [MCP Registry Spec](https://github.com/modelcontextprotocol/registry/blob/main/docs/explanations/ecosystem-vision.md)
- [x] Add the MCP UI component

```html
<open-chat
  models="[]"
  popup="true"
  server-url=""
  tools="[]"
></open-chat>
```
