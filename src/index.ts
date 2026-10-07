import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BEE_PROXY_URL = "http://127.0.0.1:8787";

// Initialize the MCP Server
const server = new Server(
  {
    name: "bee-enhancements-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools exposed via MCP
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "bee_search_conversations",
        description: "Search your Bee conversations using semantic/neural search. Great for finding past coding discussions or architecture decisions.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query (e.g., 'What did we decide about the database schema?')"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "bee_get_facts",
        description: "Retrieve facts and personal memory stored by Bee.",
        inputSchema: {
          type: "object",
          properties: {},
        }
      },
      {
        name: "bee_get_daily",
        description: "Retrieve your daily brief and memories for today.",
        inputSchema: {
          type: "object",
          properties: {},
        }
      }
    ]
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "bee_search_conversations") {
      const query = args?.query as string;
      const response = await fetch(`${BEE_PROXY_URL}/v1/search/conversations/neural`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 10 }),
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }

    if (name === "bee_get_facts") {
      const response = await fetch(`${BEE_PROXY_URL}/v1/facts`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }

    if (name === "bee_get_daily") {
      const response = await fetch(`${BEE_PROXY_URL}/v1/daily`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      return {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error connecting to Bee Proxy: ${error.message}. Is the proxy running (bee proxy --port 8787)?` }],
      isError: true
    };
  }
});

// Start the server using stdio transport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Bee Enhancements MCP Server running on stdio");
}

run().catch(console.error);
