/**
 * Demo and examples for Python to Blockly conversion
 *
 * This file demonstrates how to use the Python to Blockly converter
 * and the shared block definitions to maintain consistency between
 * Python code generation and parsing.
 */

import * as Blockly from "blockly";
import { pythonGenerator } from "blockly/python";
import {
  BlocklyPythonIntegration,
  BidirectionalConverter,
  ExampleUsage,
} from "./blocklyPythonIntegration";

/**
 * Example Python code snippets that can be converted to blocks
 */
export const PythonExamples = {
  basic: {
    title: "Basic Commands",
    code: `print("Hello World")
led.plot(2, 2)
time.sleep(1000)`,
    description: "Simple print, LED control, and pause commands",
  },

  buttonControl: {
    title: "Button Control",
    code: `if button_a.is_pressed():
    print("Button A!")
    led.plot(0, 0)
else:
    led.unplot(0, 0)`,
    description: "Button press detection with LED feedback",
  },

  ledPattern: {
    title: "LED Pattern Display",
    code: `display.show(Image("11111\n10101\n11111\n10101\n11111"))`,
    description: "Display a custom pattern on the LED matrix",
  },

  foreverLoop: {
    title: "Forever Loop",
    code: `while True:
    print("Running...")
    time.sleep(500)`,
    description: "Infinite loop with delay",
  },

  startup: {
    title: "Startup Function",
    code: `def on_start():
    print("Starting up!")
    led.plot(2, 2)
on_start()`,
    description: "Initialization code that runs once",
  },

  complex: {
    title: "Complex Example",
    code: `from microbit import *
import time

def on_start():
    print("Micro:bit started!")
    display.show(Image("90009\n09090\n00900\n09090\n90009"))

while True:
    if button_a.is_pressed():
        print("A pressed")
        led.plot(0, 0)
    elif button_b.is_pressed():
        print("B pressed")  
        led.plot(4, 4)
    else:
        led.unplot(0, 0)
        led.unplot(4, 4)
    time.sleep(100)`,
    description: "Complete program with startup, loop, and button handling",
  },
};

/**
 * Demo class to test conversion functionality
 */
export class ConversionDemo {
  private workspace: Blockly.Workspace;
  private integration: BlocklyPythonIntegration;
  private bidirectional: BidirectionalConverter;

  constructor(workspaceDiv: HTMLDivElement) {
    // Create workspace
    this.workspace = Blockly.inject(workspaceDiv, {
      toolbox: this.createToolbox(),
      trashcan: true,
    });

    // Setup integration
    this.integration = ExampleUsage.setupEditor(
      this.workspace,
      pythonGenerator
    );
    this.bidirectional = new BidirectionalConverter(
      this.workspace,
      pythonGenerator
    );
  }

  /**
   * Test converting a Python example to blocks
   */
  testPythonToBlocks(exampleKey: keyof typeof PythonExamples): void {
    const example = PythonExamples[exampleKey];
    console.log(`Converting: ${example.title}`);
    console.log(`Code: ${example.code}`);

    // Clear workspace
    this.workspace.clear();

    // Convert to blocks
    this.integration.importPythonCode(example.code);

    console.log("Conversion complete!");
  }

  /**
   * Test converting blocks back to Python
   */
  testBlocksToPython(): string {
    const pythonCode = this.bidirectional.blocksToPython();
    console.log("Generated Python code:");
    console.log(pythonCode);
    return pythonCode;
  }

  /**
   * Test round-trip conversion
   */
  testRoundTrip(exampleKey: keyof typeof PythonExamples): void {
    const example = PythonExamples[exampleKey];
    const result = this.bidirectional.testRoundTrip(example.code);

    console.log(`Round-trip test for: ${example.title}`);
    console.log("Original:", result.original);
    console.log("Converted:", result.converted);
    console.log("Matches:", result.matches);
  }

  /**
   * Check which patterns are supported
   */
  checkCompatibility(): void {
    console.log("Supported patterns:");
    const patterns = BlocklyPythonIntegration.getSupportedPatterns();
    Object.entries(patterns).forEach(([type, pattern]) => {
      console.log(`${type}: ${pattern}`);
    });

    console.log("\nTesting examples:");
    Object.entries(PythonExamples).forEach(([key, example]) => {
      const isCompatible = BlocklyPythonIntegration.isCompatiblePython(
        example.code
      );
      const preview = BlocklyPythonIntegration.previewConversion(example.code);
      console.log(
        `${example.title}: Compatible=${isCompatible}, Blocks=${preview.join(
          ", "
        )}`
      );
    });
  }

  /**
   * Create a toolbox for the demo
   */
  private createToolbox(): string {
    return `
<xml xmlns="https://developers.google.com/blockly/xml">
  <category name="Microbit" colour="#4C97FF">
    <block type="on_start"></block>
    <block type="forever"></block>
    <block type="show_leds"></block>
    <block type="show_string"></block>
    <block type="pause"></block>
    <block type="set_led"></block>
    <block type="button_is_pressed"></block>
  </category>
  <category name="Logic" colour="#5C81A6">
    <block type="controls_if"></block>
    <block type="logic_compare"></block>
  </category>
  <category name="Loops" colour="#5CA65C">
    <block type="controls_repeat_ext"></block>
  </category>
</xml>`;
  }

  /**
   * Get workspace for external access
   */
  getWorkspace(): Blockly.Workspace {
    return this.workspace;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.workspace.dispose();
  }
}

/**
 * Utility functions for testing and debugging
 */
export const ConverterUtils = {
  /**
   * Create a quick test in a div element
   */
  createQuickTest: (containerId: string): ConversionDemo => {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id '${containerId}' not found`);
    }

    const workspaceDiv = document.createElement("div");
    workspaceDiv.style.height = "600px";
    workspaceDiv.style.width = "100%";
    container.appendChild(workspaceDiv);

    return new ConversionDemo(workspaceDiv);
  },

  /**
   * Run all compatibility tests
   */
  runAllTests: (demo: ConversionDemo): void => {
    console.log("=== Python to Blockly Converter Tests ===");

    // Check compatibility
    demo.checkCompatibility();

    // Test each example
    Object.keys(PythonExamples).forEach((key) => {
      console.log(`\n--- Testing ${key} ---`);
      demo.testPythonToBlocks(key as keyof typeof PythonExamples);
      demo.testBlocksToPython();
      demo.testRoundTrip(key as keyof typeof PythonExamples);
    });

    console.log("\n=== Tests Complete ===");
  },
};

/**
 * Example of how to integrate this into an existing React component
 */
export const ReactIntegrationExample = `
// Example React hook for using the converter
import { useEffect, useRef, useState } from 'react';
import { ConversionDemo } from './path/to/demo';

export function usePythonBlocklyConverter() {
    const [demo, setDemo] = useState<ConversionDemo | null>(null);
    const workspaceRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (workspaceRef.current && !demo) {
            const newDemo = new ConversionDemo(workspaceRef.current);
            setDemo(newDemo);
        }

        return () => {
            demo?.dispose();
        };
    }, []);

    const convertPythonToBlocks = (pythonCode: string) => {
        demo?.integration.importPythonCode(pythonCode);
    };

    const convertBlocksToPython = () => {
        return demo?.testBlocksToPython() || '';
    };

    return {
        workspaceRef,
        convertPythonToBlocks,
        convertBlocksToPython,
        demo
    };
}

// Usage in component:
function MyBlocklyEditor() {
    const { workspaceRef, convertPythonToBlocks, convertBlocksToPython } = usePythonBlocklyConverter();
    
    return (
        <div>
            <div ref={workspaceRef} style={{ height: '400px', width: '100%' }} />
            <button onClick={() => convertPythonToBlocks('print("Hello")')}>
                Import Python
            </button>
            <button onClick={() => console.log(convertBlocksToPython())}>
                Export Python
            </button>
        </div>
    );
}
`;
