
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const server = new McpServer({
  name: "Calculator MCP Server",
  version: "1.0.0",
});

server.tool(
  "add",
  "Add two numbers",
  {
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  },
  async ({ a, b }) => {
    console.error("Adding", { a, b });
    const result = a + b;
    return { content: [{ type: "text", text: JSON.stringify({ result }) }] };
  }
);

server.tool(
  "subtract",
  "Subtract second number from first",
  {
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  },
  async ({ a, b }) => {
    console.error("Subtracting", { a, b });
    const result = a - b;
    return { content: [{ type: "text", text: JSON.stringify({ result }) }] };
  }
);

server.tool(
  "multiply",
  "Multiply two numbers",
  {
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  },
  async ({ a, b }) => {
    console.error("Multiplying", { a, b });
    const result = a * b;
    return { content: [{ type: "text", text: JSON.stringify({ result }) }] };
  }
);

server.tool(
  "divide",
  "Divide first number by second",
  {
    a: z.number().describe("First number (dividend)"),
    b: z.number().describe("Second number (divisor)"),
  },
  async ({ a, b }) => {
    console.error("Dividing", { a, b });
    if (b === 0) {
      throw new Error("Cannot divide by zero");
    }
    const result = a / b;
    return { content: [{ type: "text", text: JSON.stringify({ result }) }] };
  }
);

server.tool(
  "power",
  "Raise first number to the power of second number",
  {
    base: z.number().describe("Base number"),
    exponent: z.number().describe("Exponent"),
  },
  async ({ base, exponent }) => {
    console.error("Calculating power", { base, exponent });
    const result = Math.pow(base, exponent);
    return { content: [{ type: "text", text: JSON.stringify({ result }) }] };
  }
);

server.tool(
  "sqrt",
  "Calculate square root of a number",
  {
    number: z.number().describe("Number to find square root of"),
  },
  async ({ number }) => {
    console.error("Calculating square root", { number });
    if (number < 0) {
      throw new Error("Cannot calculate square root of negative number");
    }
    const result = Math.sqrt(number);
    return { content: [{ type: "text", text: JSON.stringify({ result }) }] };
  }
);