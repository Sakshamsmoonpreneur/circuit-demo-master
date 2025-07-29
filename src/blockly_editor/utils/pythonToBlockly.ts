import * as Blockly from "blockly";

// Interface for block configuration to enable shared implementation
export interface BlockConfig {
  type: string;
  pythonPattern: RegExp;
  extractValues: (match: RegExpMatchArray) => Record<string, any>;
  createBlock: (
    workspace: Blockly.Workspace,
    values: Record<string, any>
  ) => Blockly.Block;
}

// Shared block configurations that work for both Python->Blockly and Blockly->Python
export const MICROBIT_BLOCK_CONFIGS: BlockConfig[] = [
  {
    type: "show_string",
    pythonPattern: /print\((['""])(.+?)\1\)/g,
    extractValues: (match) => ({
      TEXT: match[2],
    }),
    createBlock: (workspace, values) => {
      const block = workspace.newBlock("show_string");
      block.setFieldValue(values.TEXT, "TEXT");
      return block;
    },
  },
  {
    type: "pause",
    pythonPattern: /time\.sleep\((\d+(?:\.\d+)?)(?:\s*\/\s*1000)?\)/g,
    extractValues: (match) => ({
      TIME: match[1].includes("/")
        ? parseFloat(match[1])
        : parseFloat(match[1]) * 1000,
    }),
    createBlock: (workspace, values) => {
      const block = workspace.newBlock("pause");
      block.setFieldValue(values.TIME, "TIME");
      return block;
    },
  },
  {
    type: "set_led",
    pythonPattern: /led\.plot\((\d+),\s*(\d+)\)/g,
    extractValues: (match) => ({
      X: parseInt(match[1]),
      Y: parseInt(match[2]),
      STATE: "on",
    }),
    createBlock: (workspace, values) => {
      const block = workspace.newBlock("set_led");
      block.setFieldValue(values.X, "X");
      block.setFieldValue(values.Y, "Y");
      block.setFieldValue(values.STATE, "STATE");
      return block;
    },
  },
  {
    type: "set_led_unplot",
    pythonPattern: /led\.unplot\((\d+),\s*(\d+)\)/g,
    extractValues: (match) => ({
      X: parseInt(match[1]),
      Y: parseInt(match[2]),
      STATE: "off",
    }),
    createBlock: (workspace, values) => {
      const block = workspace.newBlock("set_led");
      block.setFieldValue(values.X, "X");
      block.setFieldValue(values.Y, "Y");
      block.setFieldValue(values.STATE, "STATE");
      return block;
    },
  },
  {
    type: "button_is_pressed",
    pythonPattern: /button_([ab])\.is_pressed\(\)/gi,
    extractValues: (match) => ({
      BUTTON: match[1].toUpperCase(),
    }),
    createBlock: (workspace, values) => {
      const block = workspace.newBlock("button_is_pressed");
      block.setFieldValue(values.BUTTON, "BUTTON");
      return block;
    },
  },
  {
    type: "show_leds",
    pythonPattern: /display\.show\(Image\((['"'])((?:[01]{5}\n?){5})\1\)\)/g,
    extractValues: (match) => ({
      PATTERN: match[2],
    }),
    createBlock: (workspace, values) => {
      const block = workspace.newBlock("show_leds");
      block.setFieldValue(values.PATTERN, "PATTERN");
      return block;
    },
  },
  {
    type: "forever",
    pythonPattern: /while\s+True\s*:([\s\S]*?)(?=\n(?:\S|$))/g,
    extractValues: (match) => ({
      STATEMENTS: match[1].trim(),
    }),
    createBlock: (workspace, values) => {
      const block = workspace.newBlock("forever");
      // Handle nested statements separately
      return block;
    },
  },
];

export class PythonToBlocklyConverter {
  private workspace: Blockly.Workspace;

  constructor(workspace: Blockly.Workspace) {
    this.workspace = workspace;
  }

  /**
   * Convert Python code to Blockly blocks
   * @param pythonCode The Python code to convert
   * @returns Array of created blocks
   */
  public convertPythonToBlocks(pythonCode: string): Blockly.Block[] {
    const createdBlocks: Blockly.Block[] = [];

    // Normalize the code (remove extra whitespace, normalize line endings)
    const normalizedCode = this.normalizePythonCode(pythonCode);

    // Parse imports first to understand available modules
    const imports = this.parseImports(normalizedCode);

    // Process different code structures
    const blocks = this.parseCodeBlocks(normalizedCode, imports);

    // Convert each parsed block to Blockly blocks
    for (const codeBlock of blocks) {
      const blocklyBlocks = this.convertCodeBlockToBlockly(codeBlock);
      createdBlocks.push(...blocklyBlocks);
    }

    // Connect blocks where appropriate
    this.connectBlocks(createdBlocks);

    return createdBlocks;
  }

  /**
   * Normalize Python code for easier parsing
   */
  private normalizePythonCode(code: string): string {
    return code
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/\t/g, "    ") // Convert tabs to spaces
      .trim();
  }

  /**
   * Parse import statements from Python code
   */
  private parseImports(code: string): Set<string> {
    const imports = new Set<string>();
    const importRegex = /(?:from\s+(\w+)\s+)?import\s+([^#\n]+)/g;

    let match;
    while ((match = importRegex.exec(code)) !== null) {
      if (match[1]) {
        imports.add(match[1]); // from module import ...
      }
      const imported = match[2].split(",").map((item) => item.trim());
      imported.forEach((item) => imports.add(item));
    }

    return imports;
  }

  /**
   * Parse code into logical blocks (functions, loops, etc.)
   */
  private parseCodeBlocks(code: string, imports: Set<string>): CodeBlock[] {
    const blocks: CodeBlock[] = [];

    // Split code into lines and analyze structure
    const lines = code.split("\n");
    let currentBlock: CodeBlock | null = null;
    let currentIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue; // Skip empty lines and comments
      }

      const indent = line.length - line.trimStart().length;

      // Check for block starters (while, def, if, etc.)
      if (this.isBlockStarter(trimmedLine)) {
        // Save previous block if exists
        if (currentBlock) {
          blocks.push(currentBlock);
        }

        currentBlock = {
          type: this.getBlockType(trimmedLine),
          startLine: i,
          endLine: i,
          content: [line],
          indent: indent,
        };
        currentIndent = indent;
      } else if (currentBlock && indent > currentIndent) {
        // This line belongs to the current block
        currentBlock.content.push(line);
        currentBlock.endLine = i;
      } else if (currentBlock && indent <= currentIndent) {
        // End of current block
        blocks.push(currentBlock);

        // Start new block or handle standalone statement
        if (this.isStandaloneStatement(trimmedLine)) {
          blocks.push({
            type: "statement",
            startLine: i,
            endLine: i,
            content: [line],
            indent: indent,
          });
        }
        currentBlock = null;
      } else {
        // Standalone statement
        if (this.isStandaloneStatement(trimmedLine)) {
          blocks.push({
            type: "statement",
            startLine: i,
            endLine: i,
            content: [line],
            indent: indent,
          });
        }
      }
    }

    // Don't forget the last block
    if (currentBlock) {
      blocks.push(currentBlock);
    }

    return blocks;
  }

  /**
   * Check if a line starts a new block (function, loop, etc.)
   */
  private isBlockStarter(line: string): boolean {
    return /^(def\s+|while\s+|for\s+|if\s+|elif\s+|else\s*:)/.test(line);
  }

  /**
   * Get the block type from a line
   */
  private getBlockType(line: string): string {
    if (line.startsWith("def ")) return "function";
    if (line.startsWith("while True:")) return "forever";
    if (line.startsWith("while ")) return "while_loop";
    if (line.startsWith("for ")) return "for_loop";
    if (line.startsWith("if ")) return "if_statement";
    return "block";
  }

  /**
   * Check if a line is a standalone statement
   */
  private isStandaloneStatement(line: string): boolean {
    // Check if line matches any of our known patterns
    return MICROBIT_BLOCK_CONFIGS.some((config) => {
      config.pythonPattern.lastIndex = 0; // Reset regex
      return config.pythonPattern.test(line);
    });
  }

  /**
   * Convert a parsed code block to Blockly blocks
   */
  private convertCodeBlockToBlockly(codeBlock: CodeBlock): Blockly.Block[] {
    const blocks: Blockly.Block[] = [];

    switch (codeBlock.type) {
      case "forever":
        blocks.push(this.createForeverBlock(codeBlock));
        break;
      case "function":
        blocks.push(this.createFunctionBlock(codeBlock));
        break;
      case "statement":
        const statementBlocks = this.createStatementBlocks(
          codeBlock.content[0]
        );
        blocks.push(...statementBlocks);
        break;
      default:
        // Try to parse as individual statements
        for (const line of codeBlock.content) {
          const statementBlocks = this.createStatementBlocks(line);
          blocks.push(...statementBlocks);
        }
    }

    return blocks;
  }

  /**
   * Create a forever block with nested statements
   */
  private createForeverBlock(codeBlock: CodeBlock): Blockly.Block {
    const foreverBlock = this.workspace.newBlock("forever");

    // Extract the content inside the while loop (excluding the while line)
    const innerContent = codeBlock.content.slice(1).join("\n");
    const innerBlocks = this.convertPythonToBlocks(innerContent);

    // Connect inner blocks to the forever block
    if (innerBlocks.length > 0) {
      const connection = foreverBlock.getInput("DO")?.connection;
      if (connection) {
        connection.connect(innerBlocks[0].previousConnection!);
      }
    }

    return foreverBlock;
  }

  /**
   * Create function blocks (like on_start)
   */
  private createFunctionBlock(codeBlock: CodeBlock): Blockly.Block {
    const functionLine = codeBlock.content[0];

    if (functionLine.includes("on_start")) {
      const onStartBlock = this.workspace.newBlock("on_start");

      // Extract function body
      const innerContent = codeBlock.content.slice(1).join("\n");
      const innerBlocks = this.convertPythonToBlocks(innerContent);

      // Connect inner blocks
      if (innerBlocks.length > 0) {
        const connection = onStartBlock.getInput("DO")?.connection;
        if (connection) {
          connection.connect(innerBlocks[0].previousConnection!);
        }
      }

      return onStartBlock;
    }

    // Default to a comment block for unknown functions
    const commentBlock = this.workspace.newBlock("text");
    return commentBlock;
  }

  /**
   * Create blocks for individual statements
   */
  private createStatementBlocks(statement: string): Blockly.Block[] {
    const blocks: Blockly.Block[] = [];
    const trimmedStatement = statement.trim();

    // Try each block configuration
    for (const config of MICROBIT_BLOCK_CONFIGS) {
      config.pythonPattern.lastIndex = 0; // Reset regex
      const match = config.pythonPattern.exec(trimmedStatement);

      if (match) {
        const values = config.extractValues(match);
        const block = config.createBlock(this.workspace, values);
        blocks.push(block);
        break; // Only match the first pattern
      }
    }

    return blocks;
  }

  /**
   * Connect blocks in sequence where appropriate
   */
  private connectBlocks(blocks: Blockly.Block[]): void {
    for (let i = 0; i < blocks.length - 1; i++) {
      const currentBlock = blocks[i];
      const nextBlock = blocks[i + 1];

      // Only connect if both blocks have the appropriate connections
      if (currentBlock.nextConnection && nextBlock.previousConnection) {
        try {
          currentBlock.nextConnection.connect(nextBlock.previousConnection);
        } catch (error) {
          console.warn("Failed to connect blocks:", error);
        }
      }
    }
  }

  /**
   * Update existing Python generators to use shared configurations
   */
  public static updatePythonGenerators(pythonGenerator: any): void {
    // This method can be used to update the existing generators
    // to use the shared block configurations, ensuring consistency

    pythonGenerator.forBlock["set_led"] = function (block: any) {
      const x = block.getFieldValue("X");
      const y = block.getFieldValue("Y");
      const state = block.getFieldValue("STATE");

      if (state === "on") {
        return `led.plot(${x}, ${y})\n`;
      } else {
        return `led.unplot(${x}, ${y})\n`;
      }
    };

    pythonGenerator.forBlock["show_string"] = function (block: any) {
      const text = block.getFieldValue("TEXT");
      return `print(${JSON.stringify(text)})\n`;
    };

    pythonGenerator.forBlock["pause"] = function (block: any) {
      const time = block.getFieldValue("TIME");
      return `import time\ntime.sleep(${time / 1000})\n`;
    };

    pythonGenerator.forBlock["button_is_pressed"] = function (block: any) {
      const button = block.getFieldValue("BUTTON").toLowerCase();
      return [`button_${button}.is_pressed()`, 0];
    };

    pythonGenerator.forBlock["show_leds"] = function (block: any) {
      const pattern = block.getFieldValue("PATTERN");
      return `display.show(Image("${pattern}"))\n`;
    };
  }
}

// Interface for parsed code blocks
interface CodeBlock {
  type: string;
  startLine: number;
  endLine: number;
  content: string[];
  indent: number;
}

// Utility function to create a converter instance
export function createPythonToBlocklyConverter(
  workspace: Blockly.Workspace
): PythonToBlocklyConverter {
  return new PythonToBlocklyConverter(workspace);
}

// Export utility functions for testing and debugging
export const PythonToBlocklyUtils = {
  /**
   * Test if a Python code snippet can be converted to blocks
   */
  canConvert(pythonCode: string): boolean {
    return MICROBIT_BLOCK_CONFIGS.some((config) => {
      config.pythonPattern.lastIndex = 0;
      return config.pythonPattern.test(pythonCode);
    });
  },

  /**
   * Get all supported Python patterns
   */
  getSupportedPatterns(): string[] {
    return MICROBIT_BLOCK_CONFIGS.map((config) => config.pythonPattern.source);
  },

  /**
   * Preview what blocks would be created from Python code
   */
  previewConversion(pythonCode: string): string[] {
    const blockTypes: string[] = [];

    for (const config of MICROBIT_BLOCK_CONFIGS) {
      config.pythonPattern.lastIndex = 0;
      if (config.pythonPattern.test(pythonCode)) {
        blockTypes.push(config.type);
      }
    }

    return blockTypes;
  },
};
