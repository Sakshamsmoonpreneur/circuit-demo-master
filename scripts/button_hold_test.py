from microbit import *
from time import sleep

# This script shows 'A' while button A is held, clears when released.
# It tries the common micro:bit API (button_a.is_pressed()),
# and falls back to input.button_is_pressed(Button.A) if needed.

while True:
    try:
        pressed = button_a.is_pressed()
    except NameError:
        try:
            pressed = input.button_is_pressed(Button.A)
        except Exception:
            pressed = False

    if pressed:
        display.show('A')
    else:
        display.clear()

    sleep(100)
