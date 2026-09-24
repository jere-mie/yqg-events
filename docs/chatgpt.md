# ChatGPT connection and automation

## One deployment, two interfaces

The application exposes a normal bearer-authenticated event API and a remote **Streamable HTTP MCP server** at `https://YOUR_HOST/mcp`. In ChatGPT this becomes a personal app/plugin. Custom chat UI is unnecessary for event ingestion; tool responses include structured results and text. The public site remains usable independently.

## Connection steps after deployment

1. Verify that the final HTTPS site is reachable. Configure `APP_URL` to that origin and apply database migrations.
2. Set `EVENT_INGEST_API_KEY`, `OAUTH_SIGNING_SECRET`, `OWNER_PASSWORD_HASH` and `OAUTH_REDIRECT_URIS`. Use the generated owner password only in the consent screen.
3. Enable developer mode in ChatGPT, then create a personal app/plugin with the URL `https://YOUR_HOST/mcp` and OAuth authentication. This server supports dynamic client registration with `token_endpoint_auth_method=none` and authorization code + PKCE S256. Leave client credentials empty when ChatGPT offers dynamic registration.
4. Copy the **exact callback URI** displayed by ChatGPT into `OAUTH_REDIRECT_URIS`, then retry the connection. The stable default is `https://chatgpt.com/connector_platform_oauth_redirect`; some connections may show a callback-specific URI. Both metadata documents identify the same issuer, and authorization responses include `iss`.
5. Authorize on your own site's consent screen using the owner password. Never send the password or ingestion key in a chat message. ChatGPT receives scoped OAuth tokens, not the password.
6. In a regular chat, test read, draft creation, update and archive. Review the source and explicitly publish a verified test listing. Use the browser to confirm the public result.

Discovery URLs: `/.well-known/oauth-protected-resource`, `/.well-known/oauth-protected-resource/mcp`, `/.well-known/oauth-authorization-server`. Unauthenticated MCP POST requests return `401` with `WWW-Authenticate` discovery. `/mcp` intentionally rejects GET/DELETE with `405` because it is stateless and does not offer a server-initiated SSE stream. POST supports the normal MCP handshake and tool calls.

## Tools

| Tool                       | Scope          | Purpose                                                            |
| -------------------------- | -------------- | ------------------------------------------------------------------ |
| `list_upcoming_events`     | `events:read`  | Filters and pagination; use `status=published` for public results. |
| `find_event`               | `events:read`  | Read a full event by ID before updating.                           |
| `find_possible_duplicates` | `events:read`  | Inspect a candidate before creation.                               |
| `create_event`             | `events:write` | Create a sourced listing; defaults to draft.                       |
| `update_event`             | `events:write` | Change only supplied fields; publish/unpublish/cancel.             |
| `archive_event`            | `events:write` | Reversible removal from public views.                              |

The tool metadata distinguishes reads and writes, marks updates/archives as potentially destructive, and advertises required OAuth scopes. The handlers always enforce access independently of model instructions. Writes return the actual saved record. Conflicts and validation failures are MCP tool errors, not success messages.

## Schedule later

The [collector prompt](collector-prompt.md) is designed to be pasted into a future recurring task. First test it manually with this connection and web research available. Then choose your cadence and enable the personal plugin for that task. Review the first few runs.

Current official documentation describes connected tools and plugins in supported scheduled tasks. Your plan/workspace, app permissions, and approval rules determine whether unattended writes run. Hosting an MCP server does not override those rules. If your account cannot do unattended writes, use a scheduled script/API client with the ingestion key or run the collector interactively. No scheduled task was created as part of implementation, and the website does not itself perform discovery.

## Local protocol testing

`npm test` exercises initialization, tool listing, MCP creation/error responses, OAuth code exchange, PKCE, consent nonces, scopes, token rotation/replay and revocation. `npm run test:e2e` exercises the real HTTP consent form and cookie, then calls MCP with the exchanged token. For manual MCP Inspector testing, allowlist its exact loopback callback **only in local development**, then remove it before deployment. Use HTTPS or a supported secure tunnel for a ChatGPT-hosted connection.

## Sources checked during implementation

- [OpenAI authentication contract](https://developers.openai.com/plugins/build/auth)
- [Personal plugin quickstart](https://developers.openai.com/plugins/quickstart)
- [Connect and test a plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [Scheduled tasks](https://learn.chatgpt.com/docs/automations)
- [Official TypeScript MCP SDK](https://ts.sdk.modelcontextprotocol.io/)

Product names and settings can change; use the current connection screen's exact callback rather than guessing.
