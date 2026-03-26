# **App Name**: SheetFlow

## Core Features:

- Editable Grid Interface: A dynamically rendering spreadsheet grid with editable cells, supporting intuitive keyboard navigation (arrow keys, enter, tab) and standard copy-paste functionality.
- Robust Formula Engine: Interprets and executes basic mathematical formulas (e.g., =SUM(), =AVG(), =A1+B1), managing and updating cell dependencies for real-time recalculation.
- Sheet File Operations: Enable users to create new spreadsheets, load existing ones, save current work, rename, and delete sheets via a persistent MongoDB backend.
- Minimal Formatting Toolbar: An accessible UI toolbar offering essential text formatting options such as bolding and basic text alignment to enhance cell appearance.
- Automated Persistence: Implements auto-save functionality to periodically and silently store the user's current spreadsheet state to the backend database.
- AI Formula Assistant Tool: Provides AI-powered suggestions for common formulas based on selected cell data patterns or translates simple natural language requests into spreadsheet formulas.

## Style Guidelines:

- Primary color: A professional and clean deep blue (#2E5CCC) to signify trust and stability for data management.
- Background color: A very light, desaturated blue-gray (#F2F4F9) providing a clean canvas that enhances focus on content.
- Accent color: A vibrant yet subtle violet-blue (#5B43DB) for interactive elements and highlights, offering good contrast with the primary.
- Body and headline font: 'Inter' (sans-serif) for its modern, objective, and highly legible appearance, suitable for complex data display.
- Use clean, outlined vector icons with a uniform stroke weight, emphasizing functionality and clarity in an 'Excel-like' context.
- Adopt a flexible grid-based layout that prioritizes content legibility and responsive behavior, emulating a familiar spreadsheet structure with well-defined cell borders.
- Incorporate subtle micro-interactions, such as smooth cell selection highlights and gentle transitions for sheet loading, to enhance user feedback without being distracting.