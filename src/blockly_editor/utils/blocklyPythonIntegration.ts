import * as Blockly from "blockly";
import {
  EnhancedPythonToBlocklyConverter,
  SharedBlockRegistry,
} from "./sharedBlockDefinitions";

/**
 * Integration utilities for adding Python-to-Blockly conversion
 * to existing Blockly editors
 */
export class BlocklyPythonIntegration {
  private workspace: Blockly.Workspace;
  private converter: EnhancedPythonToBlocklyConverter;

  constructor(workspace: Blockly.Workspace) {
    this.workspace = workspace;
    this.converter = new EnhancedPythonToBlocklyConverter(workspace);
  }

  /**
   * Initialize the integration by registering shared blocks
   */
  static initialize(): void {
    SharedBlockRegistry.registerBlocks();
  }

  /**
   * Setup Python generators using shared definitions
   */
  static setupPythonGenerators(pythonGenerator: any): void {
    SharedBlockRegistry.registerPythonGenerators(pythonGenerator);
  }

  /**
   * Convert Python code to blocks and add them to the workspace
   */
  importPythonCode(pythonCode: string): void {
    // Clear existing blocks (optional - you might want to ask user first)
    // this.workspace.clear();

    // Convert Python to blocks
    const blocks = this.converter.convertPythonToBlocks(pythonCode);

    // Position blocks nicely in the workspace
    this.positionBlocks(blocks);
  }

  /**
   * Convert current blocks to Python code
   */
  exportToPython(pythonGenerator: any): string {
    return pythonGenerator.workspaceToCode(this.workspace);
  }

  /**
   * Position blocks in a neat arrangement
   */
  private positionBlocks(blocks: Blockly.Block[]): void {
    let x = 20;
    let y = 20;
    const spacing = 100;

    blocks.forEach((block) => {
      block.moveBy(x, y);
      y += spacing;
    });
  }

  /**
   * Check if Python code is compatible with current block definitions
   */
  static isCompatiblePython(pythonCode: string): boolean {
    const matchingBlocks = SharedBlockRegistry.matchesPythonPattern(pythonCode);
    return matchingBlocks.length > 0;
  }

  /**
   * Preview what blocks would be created from Python code
   */
  static previewConversion(pythonCode: string): string[] {
    const matches = SharedBlockRegistry.matchesPythonPattern(pythonCode);
    return matches.map((match) => match.type);
  }

  /**
   * Get supported Python patterns for documentation
   */
  static getSupportedPatterns(): Record<string, string> {
    const patterns: Record<string, string> = {};

    SharedBlockRegistry.getBlockTypes().forEach((type) => {
      const blockDef = SharedBlockRegistry.getBlockDefinition(type);
      if (blockDef) {
        patterns[type] = blockDef.pythonPattern.source;
      }
    });

    return patterns;
  }
}

/**
 * Example usage functions
 */
export const ExampleUsage = {
  /**
   * Example: Setup a BlocklyEditor with Python conversion support
   */
  setupEditor: (workspace: Blockly.Workspace, pythonGenerator: any) => {
    // Initialize shared blocks
    BlocklyPythonIntegration.initialize();

    // Setup Python generators
    BlocklyPythonIntegration.setupPythonGenerators(pythonGenerator);

    // Create integration instance
    const integration = new BlocklyPythonIntegration(workspace);

    return integration;
  },

  /**
   * Example Python code that can be converted
   */
  samplePythonCode: `from microbit import *
import time

def on_start():
    print("Hello World")
    led.plot(2, 2)
    time.sleep(1)

while True:
    if button_a.is_pressed():
        print("Button A pressed!")
    time.sleep(0.1)`,

  /**
   * Test the conversion with sample code
   */
  testConversion: (workspace: Blockly.Workspace) => {
    const integration = new BlocklyPythonIntegration(workspace);
    integration.importPythonCode(ExampleUsage.samplePythonCode);
    console.log("Conversion complete!");
  },
};

/**
 * Utility for bidirectional conversion
 */
export class BidirectionalConverter {
  private integration: BlocklyPythonIntegration;
  private pythonGenerator: any;

  constructor(workspace: Blockly.Workspace, pythonGenerator: any) {
    this.integration = new BlocklyPythonIntegration(workspace);
    this.pythonGenerator = pythonGenerator;
  }

  /**
   * Convert from Python to Blocks
   */
  pythonToBlocks(pythonCode: string): void {
    this.integration.importPythonCode(pythonCode);
  }

  /**
   * Convert from Blocks to Python
   */
  blocksToPython(): string {
    return this.integration.exportToPython(this.pythonGenerator);
  }

  /**
   * Sync changes - useful for bidirectional editors
   */
  syncFromPython(pythonCode: string): string {
    // Convert Python to blocks
    this.pythonToBlocks(pythonCode);

    // Convert back to Python to normalize
    return this.blocksToPython();
  }

  /**
   * Check if round-trip conversion preserves intent
   */
  testRoundTrip(pythonCode: string): {
    original: string;
    converted: string;
    matches: boolean;
  } {
    const original = pythonCode.trim();
    const converted = this.syncFromPython(pythonCode).trim();

    return {
      original,
      converted,
      matches: this.semanticallyEqual(original, converted),
    };
  }

  /**
   * Simple semantic equality check (can be enhanced)
   */
  private semanticallyEqual(code1: string, code2: string): boolean {
    // Remove whitespace and normalize for basic comparison
    const normalize = (code: string) =>
      code.replace(/\s+/g, " ").replace(/\n/g, " ").trim();

    return normalize(code1) === normalize(code2);
  }
}
