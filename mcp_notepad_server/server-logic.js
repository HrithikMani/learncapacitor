import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Enhanced logging function
const log = (operation, params, result = null, executionTime = null, error = null) => {
  const timestamp = new Date().toISOString();
  const status = error ? 'ERROR' : 'SUCCESS';
  
  console.log(`[${timestamp}] [${status}] Operation: ${operation}`);
  console.log(`  Params: ${JSON.stringify(params)}`);
  
  if (error) {
    console.error(`  Error: ${error.message}`);
    if (error.stack) {
      console.error(`  Stack: ${error.stack}`);
    }
  } else if (result) {
    // For large content, truncate the logged output
    const logResult = { ...result };
    if (logResult.content && typeof logResult.content === 'string' && logResult.content.length > 100) {
      logResult.content = `${logResult.content.substring(0, 100)}... (${logResult.content.length} bytes)`;
    }
    console.log(`  Result: ${JSON.stringify(logResult)}`);
  }
  
  if (executionTime !== null) {
    console.log(`  Execution time: ${executionTime}ms`);
  }
};

// Performance tracking wrapper
const trackPerformance = async (operation, params, callback) => {
  const startTime = performance.now();
  try {
    const result = await callback();
    const executionTime = (performance.now() - startTime).toFixed(2);
    log(operation, params, result, executionTime);
    return { result, executionTime };
  } catch (error) {
    const executionTime = (performance.now() - startTime).toFixed(2);
    log(operation, params, null, executionTime, error);
    throw error;
  }
};

// In-memory storage for files that haven't been saved yet
const fileContents = new Map();
// Store file metadata
const fileMetadata = new Map();

// Initialize enhanced server
export const server = new McpServer({
  name: "Enhanced Notepad MCP Server",
  version: "1.1.0",
  description: "A feature-rich notepad service with advanced file operations"
});

// Update file metadata helper function
const updateFileMetadata = (fileName) => {
  if (!fileMetadata.has(fileName)) {
    fileMetadata.set(fileName, {
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      size: 0,
      revisions: 0
    });
  } else {
    const metadata = fileMetadata.get(fileName);
    metadata.lastModified = new Date().toISOString();
    metadata.size = fileContents.get(fileName)?.length || 0;
    metadata.revisions += 1;
    fileMetadata.set(fileName, metadata);
  }
};

// File existence validator
const validateFileExists = (fileName) => {
  if (!fileContents.has(fileName)) {
    throw new Error(`File "${fileName}" does not exist. Create it first.`);
  }
};

// Create a new file
server.tool(
  "createFile",
  "Create a new file with a name",
  {
    fileName: z.string().nonempty().describe("Name of the file to create"),
    initialContent: z.string().optional().default("").describe("Optional initial content for the file"),
    overwrite: z.boolean().optional().default(false).describe("Whether to overwrite if file already exists")
  },
  async ({ fileName, initialContent, overwrite }) => {
    return await trackPerformance("createFile", { fileName, contentLength: initialContent.length, overwrite }, async () => {
      // Check if file already exists
      if (fileContents.has(fileName) && !overwrite) {
        throw new Error(`File "${fileName}" already exists. Use overwrite flag to replace it.`);
      }
      
      // Initialize an empty or provided content for this filename
      fileContents.set(fileName, initialContent);
      updateFileMetadata(fileName);
      
      const metadata = fileMetadata.get(fileName);
      
      return { 
        message: `File "${fileName}" ${overwrite ? "overwritten" : "created"}`,
        fileName,
        contentLength: initialContent.length,
        metadata
      };
    }).then(({ result, executionTime }) => {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            ...result,
            executionTime: `${executionTime}ms`
          }) 
        }] 
      };
    });
  }
);

// Add content to a file
server.tool(
  "addContent",
  "Add content to a file",
  {
    fileName: z.string().nonempty().describe("Name of the file to add content to"),
    content: z.string().describe("Content to add to the file"),
    append: z.boolean().optional().default(true).describe("Whether to append (true) or overwrite (false)"),
    position: z.number().optional().describe("Position to insert content (only used when append is true)")
  },
  async ({ fileName, content, append, position }) => {
    return await trackPerformance("addContent", { fileName, contentLength: content.length, append, position }, async () => {
      validateFileExists(fileName);
      
      const currentContent = fileContents.get(fileName);
      let newContent;
      
      if (!append) {
        // Overwrite mode
        newContent = content;
      } else if (position !== undefined && position >= 0 && position <= currentContent.length) {
        // Insert at position
        newContent = currentContent.substring(0, position) + content + currentContent.substring(position);
      } else {
        // Default append to end
        newContent = currentContent + content;
      }
      
      fileContents.set(fileName, newContent);
      updateFileMetadata(fileName);
      
      const metadata = fileMetadata.get(fileName);
      
      return {
        message: append 
          ? (position !== undefined 
            ? `Content inserted at position ${position} in file "${fileName}"` 
            : `Content appended to file "${fileName}"`)
          : `Content set for file "${fileName}"`,
        contentLength: newContent.length,
        changeLength: newContent.length - currentContent.length,
        metadata
      };
    }).then(({ result, executionTime }) => {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            ...result,
            executionTime: `${executionTime}ms`
          }) 
        }] 
      };
    });
  }
);

// Save file to disk
server.tool(
  "saveFile",
  "Save file to disk",
  {
    fileName: z.string().nonempty().describe("Name of the file to save"),
    directory: z.string().optional().default("./saved_files").describe("Directory to save the file in"),
    createBackup: z.boolean().optional().default(false).describe("Whether to create a backup of existing file")
  },
  async ({ fileName, directory, createBackup }) => {
    return await trackPerformance("saveFile", { fileName, directory, createBackup }, async () => {
      validateFileExists(fileName);
      
      try {
        // Ensure the directory exists
        await fs.mkdir(directory, { recursive: true });
        
        const filePath = path.join(directory, fileName);
        
        // Check if file exists on disk and create backup if requested
        let backupPath = null;
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile() && createBackup) {
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            backupPath = `${filePath}.${timestamp}.bak`;
            await fs.copyFile(filePath, backupPath);
          }
        } catch (err) {
          // File doesn't exist, no backup needed
        }
        
        // Write the file
        await fs.writeFile(filePath, fileContents.get(fileName));
        
        // Update metadata with on-disk info
        const fileStats = await fs.stat(filePath);
        const metadata = fileMetadata.get(fileName);
        metadata.savedPath = filePath;
        metadata.savedSize = fileStats.size;
        metadata.savedTime = new Date().toISOString();
        fileMetadata.set(fileName, metadata);
        
        return {
          message: `File "${fileName}" saved to "${filePath}"`,
          path: filePath,
          backupPath,
          metadata
        };
      } catch (error) {
        throw new Error(`Failed to save file: ${error.message}`);
      }
    }).then(({ result, executionTime }) => {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            ...result,
            executionTime: `${executionTime}ms`
          }) 
        }] 
      };
    });
  }
);

// Read file contents
server.tool(
  "readFile",
  "Read the contents of a file",
  {
    fileName: z.string().nonempty().describe("Name of the file to read"),
    includeMetadata: z.boolean().optional().default(true).describe("Whether to include file metadata")
  },
  async ({ fileName, includeMetadata }) => {
    return await trackPerformance("readFile", { fileName, includeMetadata }, async () => {
      validateFileExists(fileName);
      
      const content = fileContents.get(fileName);
      const result = {
        fileName,
        content,
        contentLength: content.length
      };
      
      if (includeMetadata) {
        result.metadata = fileMetadata.get(fileName);
      }
      
      return result;
    }).then(({ result, executionTime }) => {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            ...result,
            executionTime: `${executionTime}ms`
          }) 
        }] 
      };
    });
  }
);

// List all files
server.tool(
  "listFiles",
  "List all files in memory or in a directory",
  {
    source: z.enum(["memory", "disk"]).default("memory").describe("Source of files to list"),
    directory: z.string().optional().default("./saved_files").describe("Directory to list files from (when source is 'disk')"),
    includeMetadata: z.boolean().optional().default(true).describe("Whether to include file metadata")
  },
  async ({ source, directory, includeMetadata }) => {
    return await trackPerformance("listFiles", { source, directory, includeMetadata }, async () => {
      if (source === "memory") {
        // List files in memory
        const files = Array.from(fileContents.keys());
        
        const result = {
          source: "memory",
          count: files.length,
          files
        };
        
        if (includeMetadata) {
          result.filesWithMetadata = files.map(fileName => ({
            fileName,
            metadata: fileMetadata.get(fileName)
          }));
        }
        
        return result;
      } else {
        // List files on disk
        try {
          await fs.mkdir(directory, { recursive: true });
          const files = await fs.readdir(directory);
          
          const result = {
            source: "disk",
            directory,
            count: files.length,
            files
          };
          
          if (includeMetadata && files.length > 0) {
            result.filesWithMetadata = await Promise.all(
              files.map(async (fileName) => {
                try {
                  const filePath = path.join(directory, fileName);
                  const stats = await fs.stat(filePath);
                  
                  return {
                    fileName,
                    metadata: {
                      size: stats.size,
                      created: stats.birthtime.toISOString(),
                      lastModified: stats.mtime.toISOString(),
                      isDirectory: stats.isDirectory()
                    }
                  };
                } catch (error) {
                  return {
                    fileName,
                    error: error.message
                  };
                }
              })
            );
          }
          
          return result;
        } catch (error) {
          throw new Error(`Failed to list files: ${error.message}`);
        }
      }
    }).then(({ result, executionTime }) => {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            ...result,
            executionTime: `${executionTime}ms`
          }) 
        }] 
      };
    });
  }
);

// Delete a file
server.tool(
  "deleteFile",
  "Delete a file from memory or disk",
  {
    fileName: z.string().nonempty().describe("Name of the file to delete"),
    source: z.enum(["memory", "disk", "both"]).default("memory").describe("Where to delete the file from"),
    directory: z.string().optional().default("./saved_files").describe("Directory where the file is stored (when source includes 'disk')")
  },
  async ({ fileName, source, directory }) => {
    return await trackPerformance("deleteFile", { fileName, source, directory }, async () => {
      let memoryDeleted = false;
      let diskDeleted = false;
      
      if (source === "memory" || source === "both") {
        // Delete from memory
        if (fileContents.has(fileName)) {
          fileContents.delete(fileName);
          fileMetadata.delete(fileName);
          memoryDeleted = true;
        } else if (source === "memory") {
          throw new Error(`File "${fileName}" does not exist in memory.`);
        }
      }
      
      if (source === "disk" || source === "both") {
        // Delete from disk
        try {
          const filePath = path.join(directory, fileName);
          await fs.unlink(filePath);
          diskDeleted = true;
        } catch (error) {
          if (source === "disk") {
            throw new Error(`Failed to delete file from disk: ${error.message}`);
          }
        }
      }
      
      return {
        message: `File "${fileName}" deleted`,
        memoryDeleted,
        diskDeleted
      };
    }).then(({ result, executionTime }) => {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            ...result,
            executionTime: `${executionTime}ms`
          }) 
        }] 
      };
    });
  }
);

// Rename a file
server.tool(
  "renameFile",
  "Rename a file in memory or on disk",
  {
    oldFileName: z.string().nonempty().describe("Current name of the file"),
    newFileName: z.string().nonempty().describe("New name for the file"),
    source: z.enum(["memory", "disk", "both"]).default("memory").describe("Where to rename the file"),
    directory: z.string().optional().default("./saved_files").describe("Directory where the file is stored (when source includes 'disk')")
  },
  async ({ oldFileName, newFileName, source, directory }) => {
    return await trackPerformance("renameFile", { oldFileName, newFileName, source, directory }, async () => {
      let memoryRenamed = false;
      let diskRenamed = false;
      
      if (source === "memory" || source === "both") {
        // Rename in memory
        validateFileExists(oldFileName);
        
        if (fileContents.has(newFileName) && oldFileName !== newFileName) {
          throw new Error(`Destination file "${newFileName}" already exists in memory.`);
        }
        
        const content = fileContents.get(oldFileName);
        const metadata = fileMetadata.get(oldFileName);
        
        fileContents.set(newFileName, content);
        fileContents.delete(oldFileName);
        
        // Update metadata
        metadata.lastModified = new Date().toISOString();
        metadata.previousName = oldFileName;
        fileMetadata.set(newFileName, metadata);
        fileMetadata.delete(oldFileName);
        
        memoryRenamed = true;
      }
      
      if (source === "disk" || source === "both") {
        // Rename on disk
        try {
          const oldPath = path.join(directory, oldFileName);
          const newPath = path.join(directory, newFileName);
          
          // Check if the source file exists
          await fs.access(oldPath);
          
          // Rename the file
          await fs.rename(oldPath, newPath);
          diskRenamed = true;
        } catch (error) {
          if (source === "disk") {
            throw new Error(`Failed to rename file on disk: ${error.message}`);
          }
        }
      }
      
      return {
        message: `File renamed from "${oldFileName}" to "${newFileName}"`,
        memoryRenamed,
        diskRenamed
      };
    }).then(({ result, executionTime }) => {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            ...result,
            executionTime: `${executionTime}ms`
          }) 
        }] 
      };
    });
  }
);

// Search in file content
server.tool(
  "searchInFile",
  "Search for text in a file and get matches",
  {
    fileName: z.string().nonempty().describe("Name of the file to search in"),
    searchText: z.string().nonempty().describe("Text to search for"),
    caseSensitive: z.boolean().optional().default(false).describe("Whether the search is case sensitive"),
    returnMatches: z.boolean().optional().default(true).describe("Whether to return the matched text with context")
  },
  async ({ fileName, searchText, caseSensitive, returnMatches }) => {
    return await trackPerformance("searchInFile", { fileName, searchText, caseSensitive, returnMatches }, async () => {
      validateFileExists(fileName);
      
      const content = fileContents.get(fileName);
      const matches = [];
      const positions = [];
      
      // Prepare for case insensitive search if needed
      const searchContent = caseSensitive ? content : content.toLowerCase();
      const searchPattern = caseSensitive ? searchText : searchText.toLowerCase();
      
      let pos = 0;
      while ((pos = searchContent.indexOf(searchPattern, pos)) !== -1) {
        positions.push(pos);
        
        if (returnMatches) {
          // Get context (up to 20 chars before and after)
          const contextStart = Math.max(0, pos - 20);
          const contextEnd = Math.min(content.length, pos + searchPattern.length + 20);
          const before = content.substring(contextStart, pos);
          const match = content.substring(pos, pos + searchPattern.length);
          const after = content.substring(pos + searchPattern.length, contextEnd);
          
          matches.push({
            position: pos,
            line: content.substring(0, pos).split('\n').length,
            match,
            context: `...${before}${match}${after}...`
          });
        }
        
        pos += searchPattern.length;
      }
      
      return {
        fileName,
        searchText,
        occurrences: positions.length,
        positions,
        matches: returnMatches ? matches : undefined
      };
    }).then(({ result, executionTime }) => {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            ...result,
            executionTime: `${executionTime}ms`
          }) 
        }] 
      };
    });
  }
);

// Load file from disk
server.tool(
  "loadFromDisk",
  "Load a file from disk into memory",
  {
    fileName: z.string().nonempty().describe("Name of the file to load"),
    directory: z.string().optional().default("./saved_files").describe("Directory where the file is stored"),
    newFileName: z.string().optional().describe("New name to use in memory (defaults to original filename)")
  },
  async ({ fileName, directory, newFileName }) => {
    return await trackPerformance("loadFromDisk", { fileName, directory, newFileName }, async () => {
      try {
        const filePath = path.join(directory, fileName);
        const content = await fs.readFile(filePath, 'utf8');
        const stats = await fs.stat(filePath);
        
        const targetFileName = newFileName || fileName;
        
        // Store in memory
        fileContents.set(targetFileName, content);
        
        // Create metadata
        fileMetadata.set(targetFileName, {
          created: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          loadedFrom: filePath,
          originalSize: stats.size,
          originalCreated: stats.birthtime.toISOString(),
          originalModified: stats.mtime.toISOString(),
          size: content.length
        });
        
        return {
          message: `File "${fileName}" loaded from disk into memory as "${targetFileName}"`,
          fileName: targetFileName,
          originalPath: filePath,
          contentLength: content.length
        };
      } catch (error) {
        throw new Error(`Failed to load file from disk: ${error.message}`);
      }
    }).then(({ result, executionTime }) => {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            ...result,
            executionTime: `${executionTime}ms`
          }) 
        }] 
      };
    });
  }
);

// Text statistics
server.tool(
  "analyzeText",
  "Get statistics about the text in a file",
  {
    fileName: z.string().nonempty().describe("Name of the file to analyze")
  },
  async ({ fileName }) => {
    return await trackPerformance("analyzeText", { fileName }, async () => {
      validateFileExists(fileName);
      
      const content = fileContents.get(fileName);
      
      // Basic statistics
      const charCount = content.length;
      const lines = content.split('\n');
      const lineCount = lines.length;
      const words = content.split(/\s+/).filter(w => w.length > 0);
      const wordCount = words.length;
      
      // Word frequency analysis
      const wordFrequency = {};
      for (const word of words) {
        // Normalize word (lowercase, remove punctuation)
        const normalizedWord = word.toLowerCase().replace(/[^\w\s]/g, '');
        if (normalizedWord.length > 0) {
          wordFrequency[normalizedWord] = (wordFrequency[normalizedWord] || 0) + 1;
        }
      }
      
      // Get top 10 most frequent words
      const topWords = Object.entries(wordFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word, count]) => ({ word, count }));
      
      return {
        fileName,
        statistics: {
          characters: charCount,
          words: wordCount,
          lines: lineCount,
          averageWordLength: wordCount > 0 ? words.join('').length / wordCount : 0,
          averageWordsPerLine: lineCount > 0 ? wordCount / lineCount : 0
        },
        topWords,
        metadata: fileMetadata.get(fileName)
      };
    }).then(({ result, executionTime }) => {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            ...result,
            executionTime: `${executionTime}ms`
          }) 
        }] 
      };
    });
  }
);

// Replace text in file
server.tool(
  "replaceText",
  "Find and replace text in a file",
  {
    fileName: z.string().nonempty().describe("Name of the file to modify"),
    searchText: z.string().nonempty().describe("Text to search for"),
    replaceText: z.string().describe("Text to replace with"),
    caseSensitive: z.boolean().optional().default(false).describe("Whether the search is case sensitive"),
    replaceAll: z.boolean().optional().default(true).describe("Whether to replace all occurrences or just the first one")
  },
  async ({ fileName, searchText, replaceText, caseSensitive, replaceAll }) => {
    return await trackPerformance("replaceText", { fileName, searchText, replaceText, caseSensitive, replaceAll }, async () => {
      validateFileExists(fileName);
      
      const originalContent = fileContents.get(fileName);
      let newContent;
      
      if (!caseSensitive) {
        // Case insensitive replacement needs custom handling
        if (replaceAll) {
          // Create a case-insensitive regular expression
          const regex = new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
          newContent = originalContent.replace(regex, replaceText);
        } else {
          // Replace only the first occurrence
          const lowerContent = originalContent.toLowerCase();
          const lowerSearchText = searchText.toLowerCase();
          const index = lowerContent.indexOf(lowerSearchText);
          
          if (index !== -1) {
            newContent = originalContent.substring(0, index) + 
                         replaceText + 
                         originalContent.substring(index + searchText.length);
          } else {
            newContent = originalContent;
          }
        }
      } else {
        // Case sensitive replacement
        if (replaceAll) {
          // Use string split and join for full replacement
          newContent = originalContent.split(searchText).join(replaceText);
        } else {
          // Replace only the first occurrence
          newContent = originalContent.replace(searchText, replaceText);
        }
      }
      
      // Count replacements
      const replacementsCount = replaceAll 
        ? (originalContent.length - newContent.length) / (searchText.length - replaceText.length)
        : (originalContent !== newContent ? 1 : 0);
      
      // Update file content
      fileContents.set(fileName, newContent);
      updateFileMetadata(fileName);
      
      return {
        message: `Replaced ${replacementsCount} occurrence${replacementsCount !== 1 ? 's' : ''} of "${searchText}" with "${replaceText}"`,
        fileName,
        replacements: replacementsCount,
        originalLength: originalContent.length,
        newLength: newContent.length,
        metadata: fileMetadata.get(fileName)
      };
    }).then(({ result, executionTime }) => {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            ...result,
            executionTime: `${executionTime}ms`
          }) 
        }] 
      };
    });
  }
);

// Create a directory
server.tool(
  "createDirectory",
  "Create a directory on disk",
  {
    directoryPath: z.string().nonempty().describe("Path of the directory to create")
  },
  async ({ directoryPath }) => {
    return await trackPerformance("createDirectory", { directoryPath }, async () => {
      try {
        await fs.mkdir(directoryPath, { recursive: true });
        
        // Get directory info
        const stats = await fs.stat(directoryPath);
        
        return {
          message: `Directory "${directoryPath}" created successfully`,
          path: directoryPath,
          created: stats.birthtime.toISOString()
        };
      } catch (error) {
        throw new Error(`Failed to create directory: ${error.message}`);
      }
    }).then(({ result, executionTime }) => {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            ...result,
            executionTime: `${executionTime}ms`
          }) 
        }] 
      };
    });
  }
);

// Get server info and status
server.tool(
  "serverInfo",
  "Get information about the notepad server and its status",
  {},
  async () => {
    return await trackPerformance("serverInfo", {}, async () => {
      // Calculate some statistics
      const fileCount = fileContents.size;
      let totalSize = 0;
      let largestFile = { name: null, size: 0 };
      let oldestFile = { name: null, created: null };
      let newestFile = { name: null, created: null };
      
      for (const [fileName, content] of fileContents.entries()) {
        const size = content.length;
        totalSize += size;
        
        if (size > largestFile.size) {
          largestFile = { name: fileName, size };
        }
        
        const metadata = fileMetadata.get(fileName);
        if (metadata) {
          const created = new Date(metadata.created);
          
          if (!oldestFile.created || created < new Date(oldestFile.created)) {
            oldestFile = { name: fileName, created: metadata.created };
          }
          
          if (!newestFile.created || created > new Date(newestFile.created)) {
            newestFile = { name: fileName, created: metadata.created };
          }
        }
      }
      
      // Server info
      return {
        server: {
          name: server.name,
          version: server.version,
          description: server.description || "Enhanced Notepad MCP Server",
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: process.platform
        },
        operations: {
          available: Array.from(server.tools.keys()),
          count: server.tools.size
        },
        storage: {
          filesInMemory: fileCount,
          totalSize,
          largestFile: largestFile.name ? largestFile : undefined,
          oldestFile: oldestFile.name ? oldestFile : undefined,
          newestFile: newestFile.name ? newestFile : undefined
        },
        timestamp: new Date().toISOString()
      };
    }).then(({ result, executionTime }) => {
      return { 
        content: [{ 
          type: "text", 
          text: JSON.stringify({
            ...result,
            executionTime: `${executionTime}ms`
          }) 
        }] 
      };
    });
  }
);

// Server startup
console.log(`[${new Date().toISOString()}] Enhanced Notepad MCP Server initialized`);
