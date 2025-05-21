import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Enhanced logging function
const log = (operation, input, result, executionTime, error = null) => {
  const timestamp = new Date().toISOString();
  const status = error ? 'ERROR' : 'SUCCESS';
  
  console.log(`[${timestamp}] [${status}] Operation: ${operation}`);
  console.log(`  Input: ${JSON.stringify(input)}`);
  
  if (error) {
    console.error(`  Error: ${error.message}`);
  } else {
    console.log(`  Result: ${result}`);
    console.log(`  Execution time: ${executionTime}ms`);
  }
};

// Performance tracking wrapper
const trackPerformance = async (operation, input, callback) => {
  const startTime = performance.now();
  try {
    const result = await callback();
    const executionTime = (performance.now() - startTime).toFixed(2);
    log(operation, input, result, executionTime);
    return { result, executionTime };
  } catch (error) {
    const executionTime = (performance.now() - startTime).toFixed(2);
    log(operation, input, null, executionTime, error);
    throw error;
  }
};

// Initialize server with more details
export const server = new McpServer({
  name: "Enhanced Calculator MCP Server",
  version: "1.1.0",
  description: "A comprehensive calculator service with advanced mathematical operations"
});

// Basic arithmetic operations
server.tool(
  "add",
  "Add two or more numbers",
  {
    numbers: z.array(z.number()).min(2).describe("Array of numbers to add")
  },
  async ({ numbers }) => {
    const { result, executionTime } = await trackPerformance("add", { numbers }, () => {
      return numbers.reduce((sum, num) => sum + num, 0);
    });
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          result,
          operation: "addition",
          operands: numbers,
          executionTime: `${executionTime}ms`
        }) 
      }] 
    };
  }
);

server.tool(
  "subtract",
  "Subtract numbers from the first number",
  {
    numbers: z.array(z.number()).min(2).describe("Array of numbers, where first number is minuend and others are subtrahends")
  },
  async ({ numbers }) => {
    const { result, executionTime } = await trackPerformance("subtract", { numbers }, () => {
      const [first, ...rest] = numbers;
      return rest.reduce((difference, num) => difference - num, first);
    });
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          result,
          operation: "subtraction",
          operands: numbers,
          executionTime: `${executionTime}ms`
        }) 
      }] 
    };
  }
);

server.tool(
  "multiply",
  "Multiply two or more numbers",
  {
    numbers: z.array(z.number()).min(2).describe("Array of numbers to multiply")
  },
  async ({ numbers }) => {
    const { result, executionTime } = await trackPerformance("multiply", { numbers }, () => {
      return numbers.reduce((product, num) => product * num, 1);
    });
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          result,
          operation: "multiplication",
          operands: numbers,
          executionTime: `${executionTime}ms`
        }) 
      }] 
    };
  }
);

server.tool(
  "divide",
  "Divide first number by second",
  {
    dividend: z.number().describe("First number (dividend)"),
    divisor: z.number().describe("Second number (divisor)")
  },
  async ({ dividend, divisor }) => {
    const { result, executionTime } = await trackPerformance("divide", { dividend, divisor }, () => {
      if (divisor === 0) {
        throw new Error("Division by zero is not allowed");
      }
      return dividend / divisor;
    });
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          result,
          operation: "division",
          dividend,
          divisor,
          executionTime: `${executionTime}ms`
        }) 
      }] 
    };
  }
);

// Advanced operations
server.tool(
  "power",
  "Raise a number to the power of another",
  {
    base: z.number().describe("Base number"),
    exponent: z.number().describe("Exponent")
  },
  async ({ base, exponent }) => {
    const { result, executionTime } = await trackPerformance("power", { base, exponent }, () => {
      return Math.pow(base, exponent);
    });
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          result,
          operation: "exponentiation",
          base,
          exponent,
          executionTime: `${executionTime}ms`
        }) 
      }] 
    };
  }
);

server.tool(
  "sqrt",
  "Calculate square root of a number",
  {
    number: z.number().min(0).describe("Number to find square root of")
  },
  async ({ number }) => {
    const { result, executionTime } = await trackPerformance("sqrt", { number }, () => {
      if (number < 0) {
        throw new Error("Cannot calculate square root of negative number");
      }
      return Math.sqrt(number);
    });
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          result,
          operation: "square root",
          operand: number,
          executionTime: `${executionTime}ms`
        }) 
      }] 
    };
  }
);

// New mathematical operations
server.tool(
  "factorial",
  "Calculate the factorial of a non-negative integer",
  {
    number: z.number().int().min(0).max(170).describe("Non-negative integer to calculate factorial for")
  },
  async ({ number }) => {
    const { result, executionTime } = await trackPerformance("factorial", { number }, () => {
      // Ensure number is an integer
      number = Math.floor(number);
      
      if (number < 0) {
        throw new Error("Cannot calculate factorial of negative number");
      }
      
      if (number > 170) {
        throw new Error("Number too large for factorial calculation");
      }
      
      if (number === 0 || number === 1) {
        return 1;
      }
      
      let factorial = 1;
      for (let i = 2; i <= number; i++) {
        factorial *= i;
      }
      
      return factorial;
    });
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          result,
          operation: "factorial",
          operand: number,
          executionTime: `${executionTime}ms`
        }) 
      }] 
    };
  }
);

server.tool(
  "mod",
  "Calculate the modulo (remainder) of division",
  {
    dividend: z.number().describe("Number to be divided (dividend)"),
    divisor: z.number().nonnegative().describe("Number to divide by (divisor)")
  },
  async ({ dividend, divisor }) => {
    const { result, executionTime } = await trackPerformance("mod", { dividend, divisor }, () => {
      if (divisor === 0) {
        throw new Error("Modulo by zero is not allowed");
      }
      
      return dividend % divisor;
    });
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          result,
          operation: "modulo",
          dividend,
          divisor,
          executionTime: `${executionTime}ms`
        }) 
      }] 
    };
  }
);

server.tool(
  "log",
  "Calculate logarithm with specified base",
  {
    number: z.number().positive().describe("Number to calculate logarithm for"),
    base: z.number().positive().default(10).describe("Logarithm base (defaults to 10)")
  },
  async ({ number, base }) => {
    const { result, executionTime } = await trackPerformance("log", { number, base }, () => {
      if (number <= 0) {
        throw new Error("Cannot calculate logarithm of zero or negative number");
      }
      
      if (base <= 0 || base === 1) {
        throw new Error("Logarithm base must be positive and not equal to 1");
      }
      
      return Math.log(number) / Math.log(base);
    });
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          result,
          operation: "logarithm",
          number,
          base,
          executionTime: `${executionTime}ms`
        }) 
      }] 
    };
  }
);

// Advanced math functions
server.tool(
  "stats",
  "Calculate statistical measures for a set of numbers",
  {
    numbers: z.array(z.number()).min(1).describe("Array of numbers for statistical calculation")
  },
  async ({ numbers }) => {
    const { result, executionTime } = await trackPerformance("stats", { numbers }, () => {
      if (numbers.length === 0) {
        throw new Error("Array must not be empty");
      }
      
      // Calculate mean
      const sum = numbers.reduce((acc, num) => acc + num, 0);
      const mean = sum / numbers.length;
      
      // Calculate median
      const sorted = [...numbers].sort((a, b) => a - b);
      let median;
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        median = (sorted[mid - 1] + sorted[mid]) / 2;
      } else {
        median = sorted[mid];
      }
      
      // Calculate min and max
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);
      
      // Calculate variance and standard deviation
      const variance = numbers.reduce((acc, num) => acc + Math.pow(num - mean, 2), 0) / numbers.length;
      const stdDev = Math.sqrt(variance);
      
      return {
        count: numbers.length,
        sum,
        mean,
        median,
        min,
        max,
        range: max - min,
        variance,
        stdDev
      };
    });
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          result,
          operation: "statistics",
          data: numbers,
          executionTime: `${executionTime}ms`
        }) 
      }] 
    };
  }
);

server.tool(
  "trigonometry",
  "Calculate trigonometric functions",
  {
    function: z.enum(["sin", "cos", "tan", "asin", "acos", "atan"]).describe("Trigonometric function to calculate"),
    angle: z.number().describe("Angle in radians (or value for inverse functions)"),
    useDegrees: z.boolean().default(false).describe("If true, angle is in degrees; otherwise, radians")
  },
  async ({ function: func, angle, useDegrees }) => {
    const { result, executionTime } = await trackPerformance("trigonometry", { function: func, angle, useDegrees }, () => {
      // Convert to radians if using degrees
      let angleInRadians = angle;
      if (useDegrees && ["sin", "cos", "tan"].includes(func)) {
        angleInRadians = angle * (Math.PI / 180);
      }
      
      let result;
      switch (func) {
        case "sin":
          result = Math.sin(angleInRadians);
          break;
        case "cos":
          result = Math.cos(angleInRadians);
          break;
        case "tan":
          result = Math.tan(angleInRadians);
          break;
        case "asin":
          if (angle < -1 || angle > 1) {
            throw new Error("Domain error: asin input must be between -1 and 1");
          }
          result = Math.asin(angle);
          if (useDegrees) {
            result = result * (180 / Math.PI);
          }
          break;
        case "acos":
          if (angle < -1 || angle > 1) {
            throw new Error("Domain error: acos input must be between -1 and 1");
          }
          result = Math.acos(angle);
          if (useDegrees) {
            result = result * (180 / Math.PI);
          }
          break;
        case "atan":
          result = Math.atan(angle);
          if (useDegrees) {
            result = result * (180 / Math.PI);
          }
          break;
        default:
          throw new Error(`Unsupported trigonometric function: ${func}`);
      }
      
      return result;
    });
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify({ 
          result,
          operation: "trigonometry",
          function: func,
          angle,
          angleUnit: useDegrees ? "degrees" : "radians",
          executionTime: `${executionTime}ms`
        }) 
      }] 
    };
  }
);

// Server info tool
server.tool(
  "info",
  "Get information about the calculator server and available operations",
  {},
  async () => {
    const serverInfo = {
      name: server.name,
      version: server.version,
      description: server.description,
      supportedOperations: Array.from(server.tools.keys()),
      timestamp: new Date().toISOString()
    };
    
    log("info", {}, serverInfo, 0);
    
    return { 
      content: [{ 
        type: "text", 
        text: JSON.stringify(serverInfo) 
      }] 
    };
  }
);

// Server startup
console.log(`[${new Date().toISOString()}] Enhanced Calculator MCP Server initialized`);
