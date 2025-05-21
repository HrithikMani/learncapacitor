import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { server } from "./server-logic.js";

const app = express();
let transport;

app.get("/sse", async (req, res) => {
  transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  await transport.handlePostMessage(req, res);
});

const port = process.env.PORT || 8082; // Using 8082 to avoid conflict with calculator
app.listen(port, () => {
  console.log(`Notepad MCP SSE Server is running on http://localhost:${port}/sse`);
});