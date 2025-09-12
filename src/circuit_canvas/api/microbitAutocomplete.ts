// microbitAutocomplete.ts
export const microbitAutocompleteProvider = {
  provideCompletionItems: (model: any, position: any) => {
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endColumn: word.endColumn
    };

    const suggestions = [
      // ==============================
      // Display functions
      // ==============================
      {
        label: 'display.show',
        kind: 2,
        documentation: 'Show an image or text on the LED display',
        insertText: 'display.show(${1:image})',
        insertTextRules: 4,
        range
      },
      {
        label: 'display.scroll',
        kind: 2,
        documentation: 'Scroll text across the LED display',
        insertText: 'display.scroll("${1:text}")',
        insertTextRules: 4,
        range
      },
      {
        label: 'display.clear',
        kind: 2,
        documentation: 'Clear the LED display',
        insertText: 'display.clear()',
        insertTextRules: 4,
        range
      },
      {
        label: 'display.set_pixel',
        kind: 2,
        documentation: 'Set brightness (0–9) at coordinate (x, y)',
        insertText: 'display.set_pixel(${1:x}, ${2:y}, ${3:value})',
        insertTextRules: 4,
        range
      },
      {
        label: 'display.get_pixel',
        kind: 2,
        documentation: 'Get brightness value (0–9) at coordinate (x, y)',
        insertText: 'display.get_pixel(${1:x}, ${2:y})',
        insertTextRules: 4,
        range
      },

      // ==============================
      // Button functions
      // ==============================
      {
        label: 'button_a.is_pressed',
        kind: 2,
        documentation: 'Check if button A is pressed',
        insertText: 'button_a.is_pressed()',
        insertTextRules: 4,
        range
      },
      {
        label: 'button_b.is_pressed',
        kind: 2,
        documentation: 'Check if button B is pressed',
        insertText: 'button_b.is_pressed()',
        insertTextRules: 4,
        range
      },
      {
        label: 'button_a.was_pressed',
        kind: 2,
        documentation: 'Check if button A was pressed since last check',
        insertText: 'button_a.was_pressed()',
        insertTextRules: 4,
        range
      },
      {
        label: 'button_b.was_pressed',
        kind: 2,
        documentation: 'Check if button B was pressed since last check',
        insertText: 'button_b.was_pressed()',
        insertTextRules: 4,
        range
      },
      {
        label: 'button_a.get_presses',
        kind: 2,
        documentation: 'Get number of times button A was pressed',
        insertText: 'button_a.get_presses()',
        insertTextRules: 4,
        range
      },
      {
        label: 'button_b.get_presses',
        kind: 2,
        documentation: 'Get number of times button B was pressed',
        insertText: 'button_b.get_presses()',
        insertTextRules: 4,
        range
      },

      // ==============================
      // Pin functions (pin0 shown, repeatable)
      // ==============================
      {
        label: 'pin0.read_digital',
        kind: 2,
        documentation: 'Read digital value from pin0',
        insertText: 'pin0.read_digital()',
        insertTextRules: 4,
        range
      },
      {
        label: 'pin0.write_digital',
        kind: 2,
        documentation: 'Write digital value to pin0',
        insertText: 'pin0.write_digital(${1:value})',
        insertTextRules: 4,
        range
      },
      {
        label: 'pin0.read_analog',
        kind: 2,
        documentation: 'Read analog value from pin0',
        insertText: 'pin0.read_analog()',
        insertTextRules: 4,
        range
      },
      {
        label: 'pin0.write_analog',
        kind: 2,
        documentation: 'Write analog value to pin0',
        insertText: 'pin0.write_analog(${1:value})',
        insertTextRules: 4,
        range
      },

      // ==============================
      // Timing / runtime
      // ==============================
      {
        label: 'sleep',
        kind: 2,
        documentation: 'Pause for a number of milliseconds',
        insertText: 'sleep(${1:ms})',
        insertTextRules: 4,
        range
      },
      {
        label: 'running_time',
        kind: 2,
        documentation: 'Time since the board was powered on (ms)',
        insertText: 'running_time()',
        insertTextRules: 4,
        range
      },

      // ==============================
      // Sensors
      // ==============================
      {
        label: 'temperature',
        kind: 2,
        documentation: 'Return temperature in °C',
        insertText: 'temperature()',
        insertTextRules: 4,
        range
      },

      // ==============================
      // Built-in images
      // ==============================
      { label: 'Image.HEART', kind: 21, documentation: 'Heart image', insertText: 'Image.HEART', range },
      { label: 'Image.HAPPY', kind: 21, documentation: 'Happy face image', insertText: 'Image.HAPPY', range },
      { label: 'Image.SAD', kind: 21, documentation: 'Sad face image', insertText: 'Image.SAD', range },
      { label: 'Image.YES', kind: 21, documentation: 'Yes image', insertText: 'Image.YES', range },
      { label: 'Image.NO', kind: 21, documentation: 'No image', insertText: 'Image.NO', range },
      { label: 'Image.ANGRY', kind: 21, documentation: 'Angry face image', insertText: 'Image.ANGRY', range },
      { label: 'Image.CONFUSED', kind: 21, documentation: 'Confused face image', insertText: 'Image.CONFUSED', range },
      { label: 'Image.SURPRISED', kind: 21, documentation: 'Surprised face image', insertText: 'Image.SURPRISED', range },
      { label: 'Image.ASLEEP', kind: 21, documentation: 'Asleep face image', insertText: 'Image.ASLEEP', range },
      { label: 'Image.TRIANGLE', kind: 21, documentation: 'Triangle image', insertText: 'Image.TRIANGLE', range },
      { label: 'Image.CHESSBOARD', kind: 21, documentation: 'Chessboard pattern', insertText: 'Image.CHESSBOARD', range },

      // ==============================
      // Import
      // ==============================
      {
        label: 'from microbit import *',
        kind: 7,
        documentation: 'Import all micro:bit functions',
        insertText: 'from microbit import *',
        insertTextRules: 4,
        range
      },
    ];

    return { suggestions };
  }
};
