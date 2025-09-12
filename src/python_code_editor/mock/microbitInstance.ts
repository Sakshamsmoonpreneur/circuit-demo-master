import type { PyodideInterface } from "pyodide";
import { CHARACTER_PATTERNS } from "../data/characterPatterns";
import { 
  MicrobitImage, 
  STANDARD_IMAGES, 
  createImageFromString, 
  isValidImage 
} from "../data/microbitImages";

export type MicrobitEvent =
  | {
      type: "pin-change";
      pin: string;
      value: number;
      pinType: "digital" | "analog";
    }
  | { type: "led-change"; x: number; y: number; value: number }
  | { type: "button-press"; button: "A" | "B" | "AB"}
  | { type: "reset" };

type MicrobitEventCallback = (event: MicrobitEvent) => void;

interface HandlerProxy {
  wrapperProxy: any;
  persistentHandler: any;
}

class ButtonInstance {
  constructor(private name: "A" | "B" | "AB") {}

  getName(): "A" | "B" | "AB" {
    return this.name;
  }

  toString(): string {
    return this.name;
  }
}

class MicrobitEventEmitter {
  private listeners: Set<MicrobitEventCallback> = new Set();

  subscribe(callback: MicrobitEventCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(event: MicrobitEvent) {
    for (const cb of this.listeners) {
      cb(event);
    }
  }
}

export class MicrobitSimulator {
  private digitalWriteListeners: Record<string, Set<(value: number) => void>> =
    {};
  private startTime: number;

  public readonly pins = {
    digital_write_pin: this.digitalWritePin.bind(this),
    digital_read_pin: this.readDigitalPin.bind(this),
    analog_write_pin: this.analogWritePin.bind(this),
    read_analog_pin: this.readAnalogPin.bind(this),

    // NEW: subscribe to writes on a specific digital pin
    onDigitalWrite: (pin: string, cb: (value: number) => void) => {
      if (!this.digitalWriteListeners[pin])
        this.digitalWriteListeners[pin] = new Set();
      this.digitalWriteListeners[pin].add(cb);
      return () => this.digitalWriteListeners[pin].delete(cb);
    },
  };

  public readonly TRIGG = {
    digital_write_pin: this.digitalWritePin.bind(this),
  };

  public readonly ECHO = {
    digital_read_pin: this.readDigitalPin.bind(this),
  };

  // NEW: Allow external components to set pin values (for sensor simulation)
  private externalPinValues: Record<
    string,
    { digital: number; analog: number }
  > = {};

  // Method for external components (like sensors) to set pin values
  public setExternalPinValue(
    pin: string,
    value: number,
    type: "digital" | "analog" = "digital"
  ) {
    if (!this.externalPinValues[pin]) {
      this.externalPinValues[pin] = { digital: 0, analog: 0 };
    }
    this.externalPinValues[pin][type] = value;
  }

  // Update the read methods to check external values first
  private readDigitalPin(pin: string) {
    // Check if external component has set a value for this pin
    if (this.externalPinValues[pin]?.digital !== undefined) {
      return this.externalPinValues[pin].digital;
    }
    return this.pinStates[pin].digital;
  }

  private readAnalogPin(pin: string) {
    // Check if external component has set a value for this pin
    if (this.externalPinValues[pin]?.analog !== undefined) {
      return this.externalPinValues[pin].analog;
    }
    return this.pinStates[pin].analog;
  }

  // NEW: Method to get access to pin operations for external components
  public getPinController() {
    return {
      onDigitalWrite: (pin: string, cb: (value: number) => void) => {
        if (!this.digitalWriteListeners[pin]) {
          this.digitalWriteListeners[pin] = new Set();
        }
        this.digitalWriteListeners[pin].add(cb);
        return () => this.digitalWriteListeners[pin].delete(cb);
      },
      setDigitalValue: (pin: string, value: number) => {
        this.setExternalPinValue(pin, value, "digital");
      },
      setAnalogValue: (pin: string, value: number) => {
        this.setExternalPinValue(pin, value, "analog");
      },
    };
  }

  private digitalWritePin(pin: string, value: number) {
    this.pinStates[pin].digital = value;
    // notify generic event stream
    this.eventEmitter.emit({
      type: "pin-change",
      pin,
      value,
      pinType: "digital",
    });
    // NEW: notify direct listeners
    const listeners = this.digitalWriteListeners[pin];
    if (listeners) for (const cb of listeners) cb(value);
  }

  private pyodide: PyodideInterface;
  private eventEmitter = new MicrobitEventEmitter();
  private ledMatrix: number[][] = Array.from({ length: 5 }, () =>
    Array(5).fill(0)
  );
  private pinStates: Record<string, { digital: number; analog: number }> = {};
  private buttonStates: Record<"A" | "B" | "AB", boolean> = {
    A: false,
    B: false,
    AB: false,
  };
  private inputHandlers: Record<"A" | "B" | "AB", HandlerProxy[]> = {
    A: [],
    B: [],
    AB: [],
  };
  private foreverCallbacks: Set<any> = new Set();

  public readonly Button = {
    A: new ButtonInstance("A"),
    B: new ButtonInstance("B"),
    AB: new ButtonInstance("AB"),
  };

  public readonly DigitalPin: Record<string, string> = {};

  public readonly led = {
    plot: this.plot.bind(this),
    unplot: this.unplot.bind(this),
    point: this.point.bind(this),
    toggle: this.toggle.bind(this),
  };

  public readonly input = {
    on_button_pressed: this.onButtonPressed.bind(this),
    _clear: this.clearInputs.bind(this),
  };
  public readonly basic = {
    show_string: this.showString.bind(this),
    forever: this.forever.bind(this),
    pause: this.pause.bind(this),
  };

  public readonly microbit = {
    get_distance: this.showString.bind(this),
    forever: this.forever.bind(this),
    pause: this.pause.bind(this),
  };

  constructor(pyodide: PyodideInterface) {
    this.pyodide = pyodide;
    this.startTime = Date.now();

    for (let i = 0; i <= 20; i++) {
      const pin = `P${i}`;
      this.pinStates[pin] = { digital: 0, analog: 0 };
      this.DigitalPin[pin] = pin;
    }
  }

  // Add set_pixel method to handle brightness values
  private set_pixel(x: number, y: number, value: number): void {
    if (x >= 0 && x < 5 && y >= 0 && y < 5 && value >= 0 && value <= 9) {
      this.ledMatrix[y][x] = value;
      this.eventEmitter.emit({ type: "led-change", x, y, value });
    }
  }

  // Updated showImage method to use set_pixel
  private showImage(image: any): void {
    let pixels: number[][];

    if (typeof image === "string") {
      // Handle string images directly
      const rows = image.split(":");
      pixels = [];
      for (let y = 0; y < 5; y++) {
        pixels[y] = [];
        const row = rows[y] || "";
        for (let x = 0; x < 5; x++) {
          const ch = row[x] ?? "0";
          const v = parseInt(ch, 10);
          pixels[y][x] = Number.isNaN(v) ? 0 : v;
        }
      }
    } else if (image && typeof image === "object" && image.pixels) {
      // Handle MicrobitImage object
      pixels = image.pixels;
    } else {
      console.error("Invalid image format");
      return;
    }

    // Display the image using set_pixel
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        const brightness = pixels[y][x] || 0;
        this.set_pixel(x, y, brightness);
      }
    }
  }

  subscribe(callback: MicrobitEventCallback) {
    return this.eventEmitter.subscribe(callback);
  }

  private async showString(
    text: string,
    interval: number = 150
  ): Promise<void> {
    const validChars = text
      .split("")
      .filter((char) => CHARACTER_PATTERNS[char]);

    if (validChars.length === 0) {
      this.clearDisplay();
      return;
    }

    const scrollPattern: number[][] = [];

    validChars.forEach((char, index) => {
      const pattern = CHARACTER_PATTERNS[char];
      pattern.forEach((row, rowIndex) => {
        if (!scrollPattern[rowIndex]) {
          scrollPattern[rowIndex] = [];
        }
        scrollPattern[rowIndex].push(...row.map((v) => v > 0 ? 9 : 0));
        if (index < validChars.length - 1) {
          scrollPattern[rowIndex].push(0);
        }
      });
    });

    for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
      for (let i = 0; i < 5; i++) {
        scrollPattern[rowIndex].push(0);
      }
    }

    let currentOffset = 0;
    const maxOffset = scrollPattern[0].length;

    while (currentOffset < maxOffset) {
      this.clearDisplay();

      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 5; col++) {
          const patternCol = currentOffset + col;
          if (
            patternCol < scrollPattern[row].length &&
            scrollPattern[row][patternCol] > 0
          ) {
            this.set_pixel(row, col, scrollPattern[row][patternCol]);
          }
        }
      }

      currentOffset++;
      if (currentOffset < maxOffset) {
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    this.clearDisplay();
  }

  private forever(callback: () => void) {
    const proxy = this.pyodide.pyimport("pyodide.ffi.create_proxy")(callback);
    this.foreverCallbacks.add(proxy);
    this.startIndividualForeverLoop(proxy);
  }

  private startIndividualForeverLoop(callback: any) {
    const runCallback = async () => {
      try {
        await callback();
      } catch (error) {
        console.error("Error in forever loop:", error);
      }
      setTimeout(runCallback, 20);
    };
    setTimeout(runCallback, 20);
  }

  private async pause(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private clearDisplay() {
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        this.set_pixel(x, y, 0);
      }
    }
  }

  reset() {
    this.foreverCallbacks.forEach((callback) => {
      if (callback.destroy) {
        callback.destroy();
      }
    });
    this.foreverCallbacks.clear();

    for (const pin in this.pinStates) {
      this.pinStates[pin] = { digital: 0, analog: 0 };
    }
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 5; x++) {
        this.ledMatrix[y][x] = 0;
      }
    }
    this.buttonStates = { A: false, B: false, AB: false };
    this.clearInputs();
    this.eventEmitter.emit({ type: "reset" });
  }

  private analogWritePin(pin: string, value: number) {
    this.pinStates[pin].analog = value;
    this.eventEmitter.emit({
      type: "pin-change",
      pin,
      value,
      pinType: "analog",
    });
  }

  private plot(x: number, y: number) {
    this.set_pixel(x, y, 9);
  }

  private unplot(x: number, y: number) {
    this.set_pixel(x, y, 0);
  }

  private toggle(x: number, y: number) {
    const currentValue = this.ledMatrix[y][x];
    this.set_pixel(x, y, currentValue > 0 ? 0 : 9);
  }

  private point(x: number, y: number) {
    return this.ledMatrix[y][x] > 0;
  }

  // Fixed onButtonPressed method
  private onButtonPressed(button: ButtonInstance, handler: any) {
    const buttonName = button.getName();

    const { create_proxy } = this.pyodide.pyimport("pyodide.ffi");

    // Create a persistent proxy for the handler to prevent automatic destruction
    const persistentHandler = create_proxy(handler);

    const wrapperProxy = create_proxy(() => {
      try {
        return Promise.resolve(persistentHandler()); // Use the persistent proxy
      } catch (err) {
        console.error("Error in button handler:", err);
      }
    });

    // Store both proxies so we can clean them up later
    this.inputHandlers[buttonName].push({
      wrapperProxy,
      persistentHandler,
    });
  }

  // Updated pressButton method
  public async pressButton(button: ButtonInstance | "A" | "B" | "AB") {
    const buttonName = typeof button === "string" ? button : button.getName();
    this.buttonStates[buttonName] = true;

    for (const handlerProxy of this.inputHandlers[buttonName]) {
      await handlerProxy.wrapperProxy(); // Use the wrapper proxy
    }

    this.eventEmitter.emit({ type: "button-press", button: buttonName });
  }

  // Updated clearInputs method
  private clearInputs() {
    this.inputHandlers.A.forEach((handlerProxy) => {
      handlerProxy.wrapperProxy.destroy?.();
      handlerProxy.persistentHandler.destroy?.();
    });
    this.inputHandlers.B.forEach((handlerProxy) => {
      handlerProxy.wrapperProxy.destroy?.();
      handlerProxy.persistentHandler.destroy?.();
    });
    this.inputHandlers = { A: [], B: [], AB: [] };
  }

  getStateSnapshot() {
    return {
      pins: { ...this.pinStates },
      leds: this.ledMatrix.map((row) => [...row]),
      buttons: { ...this.buttonStates },
    };
  }

  private createPinInstance(pinNumber: number) {
    const pin = `P${pinNumber}`;
    return {
      read_digital: () => this.readDigitalPin(pin),
      write_digital: (value: number) => this.digitalWritePin(pin, value),
      read_analog: () => this.readAnalogPin(pin),
      write_analog: (value: number) => this.analogWritePin(pin, value),
      set_pull: () => {}, // Placeholder
      get_pull: () => 0, // Placeholder
    };
  }

  getPythonModule() {
    const module: any = {
      display: {
        show: (image: any) => {
          if (typeof image === "string") {
            this.showImage(image);
          } else if (image && typeof image === "object" && image.pixels) {
            this.showImage(image);
          } else if (typeof image === "function") {
            // Handle function-based image creation
            image({
              set_pixel: (x: number, y: number, value: number) => this.set_pixel(x, y, value)
            });
          }
        },
        scroll: (text: string, interval: number = 150) => {
          this.showString(text, interval);
        },
        clear: () => {
          this.clearDisplay();
        },
        set_pixel: (x: number, y: number, value: number) => {
          this.set_pixel(x, y, value);
        },
        get_pixel: (x: number, y: number) => {
          return this.ledMatrix[y][x];
        },
        on: () => {}, // Placeholder
        off: () => {}, // Placeholder
        is_on: () => true, // Placeholder
      },
      // Add pin instances
      pin0: this.createPinInstance(0),
      pin1: this.createPinInstance(1),
      pin2: this.createPinInstance(2),
      pin3: this.createPinInstance(3),
      pin4: this.createPinInstance(4),
      pin5: this.createPinInstance(5),
      pin6: this.createPinInstance(6),
      pin7: this.createPinInstance(7),
      pin8: this.createPinInstance(8),
      pin9: this.createPinInstance(9),
      pin10: this.createPinInstance(10),
      pin11: this.createPinInstance(11),
      pin12: this.createPinInstance(12),
      pin13: this.createPinInstance(13),
      pin14: this.createPinInstance(14),
      pin15: this.createPinInstance(15),
      pin16: this.createPinInstance(16),
      pin19: this.createPinInstance(19),
      pin20: this.createPinInstance(20),
      button_a: {
        is_pressed: () => this.buttonStates.A,
        was_pressed: () => false, // Placeholder
        get_presses: () => 0, // Placeholder
      },
      button_b: {
        is_pressed: () => this.buttonStates.B,
        was_pressed: () => false, // Placeholder
        get_presses: () => 0, // Placeholder
      },
      // Add more components as needed
      sleep: this.pause.bind(this),
      running_time: () => Date.now() - this.startTime,
      temperature: () => 20,
    };

    // Add Image constants as simple objects
    module.Image = {
      HEART: STANDARD_IMAGES.HEART,
      HAPPY: STANDARD_IMAGES.HAPPY,
      SAD: STANDARD_IMAGES.SAD,
      YES: STANDARD_IMAGES.YES,
      NO: STANDARD_IMAGES.NO,
      ANGRY: STANDARD_IMAGES.ANGRY,
      CONFUSED: STANDARD_IMAGES.CONFUSED,
      SURPRISED: STANDARD_IMAGES.SURPRISED,
      ASLEEP: STANDARD_IMAGES.ASLEEP,
      TRIANGLE: STANDARD_IMAGES.TRIANGLE,
      CHESSBOARD: STANDARD_IMAGES.CHESSBOARD,
    };

    return module;
  }
}