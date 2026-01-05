# Continued Fraction Calculator

A single-page web application to calculate and visualize continued fractions for real numbers, rationals, and common mathematical constants.

## Features

*   **Arbitrary Precision:** Uses `BigInt` arithmetic to handle extremely large integers and precise rational inputs without floating-point errors.
*   **Input Formats:**
    *   **Decimals:** `3.14159`, `-0.123`
    *   **Rationals:** `22/7`, `355/113`
    *   **Constants:** `pi`, `e`, `phi`
    *   **Square Roots:** `sqrt(2)`, `sqrt(7)` (Calculates exact periodic sequence)
*   **Visualizations:**
    *   **Standard Notation:** `[3; 7, 15, 1, 292]` or `[1; \overline{1}]`
    *   **TeX Rendering:** Beautiful nested fraction display using MathJax.
    *   **Convergents Table:** Shows the rational approximation ($p/q$) and decimal value at each step.

## Setup

No build process is required. This is a vanilla HTML/JS application.

1.  Open `index.html` in your web browser.
2.  Enjoy!

## Author

Mark VandeWettering (mvandewettering@gmail.com)
