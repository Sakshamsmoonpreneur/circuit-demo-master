"use client";

import type { PyodideInterface } from "pyodide";

const urls = {
  indexURL: {
    local: "/pyodide/",
    remote: "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/",
  },
  src: {
    local: "/pyodide/pyodide.js",
    remote: "https://cdn.jsdelivr.net/pyodide/v0.28.0/full/pyodide.js",
  },
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

declare global {
  interface Window {
    writeToConsole?: (msg: string) => void;
  }
}

export class PythonInterpreter {
  private pyodide: PyodideInterface | null = null;
  private outputCallback: ((line: string) => void) | null = null;
  private hardwareModules: Record<string, any> = {};
  private isReady = false;

  constructor(private useRemote = true) {}

  async initialize(): Promise<void> {
    if (this.pyodide) return;

    try {
      if (!this.useRemote) {
        await loadScript(urls.src.local);
        console.log("Loaded local pyodide.js");
      } else {
        await loadScript(urls.src.remote);
        console.log("Loaded remote pyodide.js");
      }
    } catch {
      if (!this.useRemote) {
        console.warn("Falling back to CDN for pyodide.js");
        await loadScript(urls.src.remote);
      }
    }

    const loadPyodide = (globalThis as any)
      .loadPyodide as typeof import("pyodide").loadPyodide;
    this.pyodide = await loadPyodide({
      indexURL: this.useRemote ? urls.indexURL.remote : urls.indexURL.local,
    });

    this.isReady = true;
  }

  setOutputCallback(callback: (line: string) => void) {
    this.outputCallback = callback;
    window.writeToConsole = (msg: string) => {
      this.outputCallback?.(msg);
    };
  }

  registerHardwareModule(name: string, module: Record<string, any>) {
    if (!this.pyodide) throw new Error("Interpreter not initialized");
    this.hardwareModules[name] = module;
    this.pyodide.registerJsModule(name, module);
  }

  async run(code: string): Promise<string> {
    if (!this.pyodide) throw new Error("Interpreter not initialized");

    try {
      await this.injectPrintRedirect();
      // reset microbit state before running new code
      await this.pyodide.runPythonAsync(code);
      return "";
    } catch (err: any) {
      return err.toString();
    }
  }

  private async injectPrintRedirect() {
    await this.pyodide!.runPythonAsync(`
      import builtins, sys
      class DualOutput:
          def __init__(self):
              self._buffer = []
          def write(self, text):
              if text.strip():
                  import js
                  js.writeToConsole(text)
              self._buffer.append(text)
          def flush(self): pass

      sys.stdout = DualOutput()
      sys.stderr = sys.stdout
      builtins.print = lambda *args, **kwargs: sys.stdout.write(" ".join(map(str, args)) + "\\n")
      `);
  }

  getPyodide(): PyodideInterface | null {
    return this.pyodide;
  }

  isInitialized(): boolean {
    return this.isReady;
  }
}
