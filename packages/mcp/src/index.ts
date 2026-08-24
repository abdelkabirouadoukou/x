#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DOCS, listTopics, searchDocs } from "./docs.js";
import { scaffold } from "./scaffold.js";

const server = new McpServer({
  name: "thexjs",
  version: "0.1.0",
});

server.registerTool(
  "list_topics",
  {
    title: "List x framework doc topics",
    description:
      "Lists every documentation topic available for the x framework (Bun full-stack React framework). " +
      "Call this first to see what's available, then call get_docs with a topic id.",
    inputSchema: {},
  },
  async () => {
    return {
      content: [{ type: "text", text: JSON.stringify(listTopics(), null, 2) }],
    };
  },
);

server.registerTool(
  "get_docs",
  {
    title: "Get x framework docs for a topic",
    description:
      "Returns grounded, accurate reference documentation for a specific x framework concept " +
      "(routing, loaders, static-vs-ssr, layouts, middleware, api-routes, actions, config, env, auth, " +
      "data, images, content, navigation, cli, gotchas). Use this BEFORE writing x framework code, " +
      "especially for routing/loaders/actions, which look similar to but are NOT the same as Next.js, " +
      "Remix, Astro, or TanStack Start syntax.",
    inputSchema: {
      topic: z
        .string()
        .describe(
          "One of: routing, loaders, static-vs-ssr, layouts, middleware, api-routes, actions, config, env, auth, data, images, content, navigation, cli, gotchas",
        ),
    },
  },
  async ({ topic }) => {
    const doc = DOCS[topic];
    if (!doc) {
      return {
        content: [
          {
            type: "text",
            text: `No doc topic "${topic}". Available topics:\n${JSON.stringify(listTopics(), null, 2)}`,
          },
        ],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `# ${doc.title}\n\n${doc.content}` }],
    };
  },
);

server.registerTool(
  "search_docs",
  {
    title: "Search x framework docs",
    description:
      "Full-text search across all x framework doc topics. Use when you don't know the exact topic id.",
    inputSchema: {
      query: z.string().describe("Search term, e.g. 'env var', 'CSRF', 'static'"),
    },
  },
  async ({ query }) => {
    const results = searchDocs(query);
    return {
      content: [
        {
          type: "text",
          text: results.length
            ? JSON.stringify(results, null, 2)
            : `No matches for "${query}". Try list_topics for the full topic list.`,
        },
      ],
    };
  },
);

server.registerTool(
  "scaffold_file",
  {
    title: "Scaffold an x framework file",
    description:
      "Generates a correctly-shaped, ready-to-paste file for a given x framework concept " +
      "(page, dynamic-page, layout, middleware, api-route, action) with the right exports, " +
      "conventions, and file path. Use this instead of hand-writing boilerplate from memory.",
    inputSchema: {
      kind: z.enum(["page", "dynamic-page", "layout", "middleware", "api-route", "action"]),
      name: z
        .string()
        .describe(
          "Route/file name, e.g. 'blog', 'users', 'send-email' (kebab or plain words, no extension)",
        ),
    },
  },
  async ({ kind, name }) => {
    const result = scaffold({ kind, name });
    return {
      content: [
        {
          type: "text",
          text: `Create this file at \`${result.path}\`:\n\n\`\`\`tsx\n${result.code}\`\`\``,
        },
      ],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
