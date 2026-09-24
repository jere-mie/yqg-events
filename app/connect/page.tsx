import { Bot, ArrowUpRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { resourceUrl } from '@/lib/config';
export const metadata = { title: 'Connect ChatGPT', alternates: { canonical: '/connect' } };
export default function Connect() {
  return (
    <main id="main" className="container prose-page">
      <div className="eyebrow">FOR THE KEEPER OF THE CALENDAR</div>
      <h1>
        A local guide.
        <br />A helpful assistant.
      </h1>
      <p className="lead">
        Connect ChatGPT to find, add and update sourced events. The website and its private event
        tools live together.
      </p>
      <div className="endpoint">
        <Bot size={24} />
        <div>
          <span>MCP SERVER URL</span>
          <code>{resourceUrl()}</code>
        </div>
        <span className="endpoint-badge">
          <ShieldCheck size={14} /> Owner access
        </span>
      </div>
      <div className="prose-columns">
        <section>
          <h2>Make the connection</h2>
          <ol>
            <li>
              First deploy the site and configure its owner credentials. A public HTTPS address is
              needed for a hosted connection.
            </li>
            <li>
              In ChatGPT’s developer settings, create an app or personal plugin using the MCP server
              URL above. Select OAuth authentication.
            </li>
            <li>
              Copy the exact callback URL from ChatGPT into the site’s allowed redirect settings.
              Then connect and sign in with the site owner password.
            </li>
            <li>
              Try a regular chat first: ask it to find existing events, add a draft, and verify the
              result before publishing.
            </li>
          </ol>
          <a
            href="https://developers.openai.com/plugins/quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="text-link"
          >
            ChatGPT connection guide <ArrowUpRight size={14} />
          </a>
        </section>
        <section>
          <h2>
            <RefreshCw size={20} /> Keep things fresh
          </h2>
          <p>
            Once the connection works, use it in a scheduled task where your ChatGPT plan and
            workspace support connected tools. Tool approval rules still apply.
          </p>
          <p>
            The project includes a ready-to-use collector prompt, with duplicate checks, source
            verification and cancellation handling. The server does not scrape sources or run AI
            when someone opens the site.
          </p>
          <p className="gentle-note">
            This integration is private to the owner. Visitors can browse events and subscribe to
            feeds without signing in.
          </p>
        </section>
      </div>
    </main>
  );
}
