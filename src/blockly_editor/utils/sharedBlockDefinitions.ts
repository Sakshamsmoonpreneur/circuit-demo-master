import * as Blockly from "blockly";

/**
 * Shared interface for block definitions that enables bidirectional conversion
 *
 * This interface ensures that each block type has all the necessary components for:
 * 1. Defining the block's appearance and behavior in Blockly (blockDefinition)
 * 2. Parsing Python code to create blocks (pythonPattern + pythonExtractor + blockCreator)
 * 3. Generating Python code from blocks (pythonGenerator)
 *
 * By using this shared approach, we eliminate code duplication and ensure consistency
 * between Python-to-Blockly and Blockly-to-Python conversions.
 */
export interface SharedBlockDefinition {
  /** Unique identifier for this block type */
  type: string;

  /** Blockly JSON definition describing the block's appearance and connections */
  blockDefinition: any;

  /** Regular expression pattern that matches Python code for this block type */
  pythonPattern: RegExp;

  /** Function that generates Python code from a Blockly block instance */
  pythonGenerator: (block: any, generator?: any) => string | [string, number];

  /** Function that extracts values from matched Python code */
  pythonExtractor: (match: RegExpMatchArray) => Record<string, any>;

  /** Function that creates a Blockly block from extracted values */
  blockCreator: (
    workspace: Blockly.Workspace,
    values: Record<string, any>
  ) => Blockly.Block;
}

/**
 * Shared block definitions for micro:bit blocks
 * This ensures consistency between Python generation and parsing
 */
export const SHARED_MICROBIT_BLOCKS: SharedBlockDefinition[] = [
  {
    type: "show_string",
    blockDefinition: {
      type: "show_string",
      message0: "show string %1",
      args0: [
        {
          type: "field_input",
          name: "TEXT",
          text: "Hello!",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 230,
      tooltip: "Show a string on the display",
    },
    pythonPattern: /print\((['""])(.+?)\1\)/g,
    pythonGenerator: (block) => {
      const text = block.getFieldValue("TEXT");
      return `print(${JSON.stringify(text)})\n`;
    },
    pythonExtractor: (match) => ({
      TEXT: match[2],
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("show_string");
      block.setFieldValue(values.TEXT, "TEXT");
      return block;
    },
  },
  {
    type: "pause",
    blockDefinition: {
      type: "pause",
      message0: "pause %1 ms",
      args0: [
        {
          type: "field_number",
          name: "TIME",
          value: 1000,
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 60,
      tooltip: "Pause execution",
    },
    pythonPattern: /time\.sleep\((\d+(?:\.\d+)?)(?:\s*\/\s*1000)?\)/g,
    pythonGenerator: (block) => {
      const time = block.getFieldValue("TIME");
      return `import time\ntime.sleep(${time / 1000})\n`;
    },
    pythonExtractor: (match) => ({
      TIME: match[1].includes("/")
        ? parseFloat(match[1])
        : parseFloat(match[1]) * 1000,
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("pause");
      block.setFieldValue(values.TIME, "TIME");
      return block;
    },
  },
  {
    type: "set_led",
    blockDefinition: {
      type: "set_led",
      message0: "set led x: %1 y: %2 %3 %4",
      args0: [
        { type: "field_number", name: "X", value: 0, min: 0, max: 4 },
        { type: "field_number", name: "Y", value: 0, min: 0, max: 4 },
        { type: "input_dummy" },
        {
          type: "field_dropdown",
          name: "STATE",
          options: [
            ["on", "on"],
            ["off", "off"],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 230,
      tooltip: "Set LED on or off at (x, y)",
    },
    pythonPattern: /led\.(plot|unplot)\((\d+),\s*(\d+)\)/g,
    pythonGenerator: (block) => {
      const x = block.getFieldValue("X");
      const y = block.getFieldValue("Y");
      const state = block.getFieldValue("STATE");

      if (state === "on") {
        return `led.plot(${x}, ${y})\n`;
      } else {
        return `led.unplot(${x}, ${y})\n`;
      }
    },
    pythonExtractor: (match) => ({
      X: parseInt(match[2]),
      Y: parseInt(match[3]),
      STATE: match[1] === "plot" ? "on" : "off",
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("set_led");
      block.setFieldValue(values.X, "X");
      block.setFieldValue(values.Y, "Y");
      block.setFieldValue(values.STATE, "STATE");
      return block;
    },
  },
  {
    type: "button_is_pressed",
    blockDefinition: {
      type: "button_is_pressed",
      message0: "button %1 is pressed",
      args0: [
        {
          type: "field_dropdown",
          name: "BUTTON",
          options: [
            ["A", "A"],
            ["B", "B"],
          ],
        },
      ],
      output: "Boolean",
      colour: 120,
      tooltip: "Check if button is pressed",
    },
    pythonPattern: /button_([ab])\.is_pressed\(\)/gi,
    pythonGenerator: (block, generator) => {
      const button = block.getFieldValue("BUTTON").toLowerCase();
      return [
        `button_${button}.is_pressed()`,
        (generator as any).ORDER_NONE || 0,
      ];
    },
    pythonExtractor: (match) => ({
      BUTTON: match[1].toUpperCase(),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("button_is_pressed");
      block.setFieldValue(values.BUTTON, "BUTTON");
      return block;
    },
  },
  {
    type: "show_leds",
    blockDefinition: {
      type: "show_leds",
      message0: "show leds %1",
      args0: [
        {
          type: "field_multilinetext",
          name: "PATTERN",
          text: "00000\n00000\n00000\n00000\n00000",
        },
      ],
      previousStatement: null,
      nextStatement: null,
      colour: 230,
      tooltip: "Display pattern on LEDs",
    },
    pythonPattern: /display\.show\(Image\((['"'])((?:[01]{5}\n?){5})\1\)\)/g,
    pythonGenerator: (block) => {
      const pattern = block.getFieldValue("PATTERN");
      return `display.show(Image("${pattern}"))\n`;
    },
    pythonExtractor: (match) => ({
      PATTERN: match[2],
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("show_leds");
      block.setFieldValue(values.PATTERN, "PATTERN");
      return block;
    },
  },
  {
    type: "forever",
    blockDefinition: {
      type: "forever",
      message0: "forever %1 %2",
      args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }],
      previousStatement: null,
      nextStatement: null,
      colour: 30,
      tooltip: "Runs code forever",
    },
    pythonPattern: /while\s+True\s*:([\s\S]*?)(?=\n(?:\S|$))/g,
    pythonGenerator: (block, generator) => {
      const statements = generator.statementToCode(block, "DO");
      return `while True:\n${statements.replace(/^/gm, "    ")}\n`;
    },
    pythonExtractor: (match) => ({
      STATEMENTS: match[1].trim(),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("forever");
      // Note: Nested statements need to be handled separately
      return block;
    },
  },
  {
    type: "on_start",
    blockDefinition: {
      type: "on_start",
      message0: "on start %1 %2",
      args0: [{ type: "input_dummy" }, { type: "input_statement", name: "DO" }],
      colour: 30,
      tooltip: "Runs once at the start",
      nextStatement: null,
    },
    pythonPattern: /def\s+on_start\(\s*\)\s*:([\s\S]*?)(?=\n(?:\S|$))/g,
    pythonGenerator: (block, generator) => {
      const statements = generator.statementToCode(block, "DO");
      return `def on_start():\n${statements.replace(
        /^/gm,
        "    "
      )}\non_start()\n`;
    },
    pythonExtractor: (match) => ({
      STATEMENTS: match[1].trim(),
    }),
    blockCreator: (workspace, values) => {
      const block = workspace.newBlock("on_start");
      // Note: Nested statements need to be handled separately
      return block;
    },
  },
];

/**
 * Utility functions for working with shared block definitions
 *
 * This registry manages all block definitions and provides methods for:
 * - Registering blocks with Blockly
 * - Setting up Python code generators
 * - Finding blocks that match Python patterns
 * - Creating blocks from Python code
 */
export class SharedBlockRegistry {
  /**
   * Register all shared block definitions with Blockly
   * This makes the blocks available in the Blockly editor toolbox and workspace
   */
  static registerBlocks(): void {
    const blockDefinitions = SHARED_MICROBIT_BLOCKS.map(
      (block) => block.blockDefinition
    );
    Blockly.defineBlocksWithJsonArray(blockDefinitions);
  }

  /**
   * Register Python code generators for all block types
   * This enables blocks-to-Python conversion
   * @param pythonGenerator The Blockly Python generator instance
   */
  static registerPythonGenerators(pythonGenerator: any): void {
    SHARED_MICROBIT_BLOCKS.forEach((block) => {
      pythonGenerator.forBlock[block.type] = block.pythonGenerator;
    });
  }

  /**
   * Find a block definition by its type name
   * @param type The block type to find
   * @returns The block definition, or undefined if not found
   */
  static getBlockDefinition(type: string): SharedBlockDefinition | undefined {
    return SHARED_MICROBIT_BLOCKS.find((block) => block.type === type);
  }

  /**
   * Get all registered block type names
   * @returns Array of block type strings
   */
  static getBlockTypes(): string[] {
    return SHARED_MICROBIT_BLOCKS.map((block) => block.type);
  }

  /**
   * Find all block definitions that match the given Python code
   * Tests the code against each block's Python pattern
   * @param code The Python code to test
   * @returns Array of matching block definitions
   */
  static matchesPythonPattern(code: string): SharedBlockDefinition[] {
    const matches: SharedBlockDefinition[] = [];

    SHARED_MICROBIT_BLOCKS.forEach((block) => {
      // Reset regex state before testing
      block.pythonPattern.lastIndex = 0;
      if (block.pythonPattern.test(code)) {
        matches.push(block);
      }
    });

    return matches;
  }

  /**
   * Create a block from Python code using the appropriate block definition
   * @param workspace The Blockly workspace to create the block in
   * @param pythonCode The Python code line to parse
   * @param blockType The type of block to create
   * @returns The created block, or null if creation failed
   */
  static createBlockFromPython(
    workspace: Blockly.Workspace,
    pythonCode: string,
    blockType: string
  ): Blockly.Block | null {
    const blockDef = this.getBlockDefinition(blockType);
    if (!blockDef) {
      return null;
    }

    // Reset regex state and try to match the Python code
    blockDef.pythonPattern.lastIndex = 0;
    const match = blockDef.pythonPattern.exec(pythonCode);
    if (!match) {
      return null;
    }

    // Extract values from the matched Python code and create the block
    const values = blockDef.pythonExtractor(match);
    return blockDef.blockCreator(workspace, values);
  }
}

/**
 * Enhanced converter that uses shared block definitions for consistent bidirectional conversion
 *
 * This converter processes Python code line by line, matching each line against known patterns
 * and creating corresponding Blockly blocks. It handles block connections automatically.
 */
export class EnhancedPythonToBlocklyConverter {
  private workspace: Blockly.Workspace;

  constructor(workspace: Blockly.Workspace) {
    this.workspace = workspace;
  }

  /**
   * Convert Python code to Blockly blocks using shared definitions
   *
   * Process:
   * 1. Split Python code into individual lines
   * 2. For each line, find matching block patterns
   * 3. Create blocks using the shared block definitions
   * 4. Connect sequential blocks together
   *
   * @param pythonCode The complete Python code to convert
   * @returns Array of created Blockly blocks
   */
  convertPythonToBlocks(pythonCode: string): Blockly.Block[] {
    const blocks: Blockly.Block[] = [];
    const lines = pythonCode.split("\n");
    let currentLine = 0;

    // Process each line of Python code
    while (currentLine < lines.length) {
      const line = lines[currentLine].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith("#")) {
        currentLine++;
        continue;
      }

      // Find block patterns that match this line
      const matchingBlocks = SharedBlockRegistry.matchesPythonPattern(line);

      if (matchingBlocks.length > 0) {
        // Use the first matching block type (most specific match)
        const blockDef = matchingBlocks[0];
        const block = SharedBlockRegistry.createBlockFromPython(
          this.workspace,
          line,
          blockDef.type
        );

        if (block) {
          blocks.push(block);
        }
      }

      currentLine++;
    }

    // Connect blocks that should be in sequence (e.g., statements in a program)
    this.connectSequentialBlocks(blocks);

    return blocks;
  }

  /**
   * Connect blocks that should be in sequence (statements that execute one after another)
   *
   * This method links blocks together using Blockly's connection system.
   * Only connects blocks that have the appropriate connection points:
   * - Current block must have a 'nextConnection'
   * - Next block must have a 'previousConnection'
   *
   * @param blocks Array of blocks to connect in order
   */
  private connectSequentialBlocks(blocks: Blockly.Block[]): void {
    for (let i = 0; i < blocks.length - 1; i++) {
      const currentBlock = blocks[i];
      const nextBlock = blocks[i + 1];

      // Only connect if both blocks have the right connection types
      if (currentBlock.nextConnection && nextBlock.previousConnection) {
        try {
          currentBlock.nextConnection.connect(nextBlock.previousConnection);
        } catch (error) {
          // Connection failed - blocks might already be connected or incompatible
          console.warn("Failed to connect blocks:", error);
        }
      }
    }
  }

  /**
   * Convert Python code to a specific block type (for targeted conversion)
   * @param pythonCode The Python code to convert
   * @param blockType The specific block type to create
   * @returns The created block, or null if conversion failed
   */
  convertToSpecificBlock(
    pythonCode: string,
    blockType: string
  ): Blockly.Block | null {
    return SharedBlockRegistry.createBlockFromPython(
      this.workspace,
      pythonCode,
      blockType
    );
  }
}

/**
 * Utility function to update existing BlocklyEditor to use shared definitions
 */
export function createUpdatedBlocklyEditor() {
  return {
    initializeSharedBlocks: () => {
      SharedBlockRegistry.registerBlocks();
    },

    setupPythonGenerators: (pythonGenerator: any) => {
      SharedBlockRegistry.registerPythonGenerators(pythonGenerator);
    },

    createConverter: (workspace: Blockly.Workspace) => {
      return new EnhancedPythonToBlocklyConverter(workspace);
    },
  };
}
