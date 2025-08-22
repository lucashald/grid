# grid

Grid Master: AI-Powered Character Placement Tool
The Problem: Traditional grid-based games and tabletop RPGs rely on pre-made character assets, limiting creativity and forcing players to settle for "close enough" representations of their vision.
Our Solution: Grid Master revolutionizes character placement by combining AI image generation with intuitive grid-based gameplay. Users can generate custom characters through natural language prompts ("a fierce orc warrior with glowing eyes") or upload their own images, then place them on intelligent grids that handle multi-tile characters, collision detection, and drag-and-drop movement.
Key Innovation: Unlike existing battle map tools that only work with developer-created sprites, Grid Master creates infinite, personalized content on-demand. Every character is unique and exactly what the user envisioned.
Tech Stack: Built with TypeScript and Konva.js for high-performance canvas rendering, ensuring smooth character manipulation even with hundreds of pieces. The frontend handles complex grid logic, multi-tile character management, and real-time interactions. Backend integration with AI APIs (OpenAI/Midjourney) for character generation, with plans for Flask server deployment for familiar Python development.
Market Opportunity: Targets tabletop gamers, game masters, content creators, and educators who need custom visual assets. The rise of online RPGs and AI image generation creates perfect timing for this innovative tool.
Competitive Advantage: First-to-market AI-integrated grid system with true multi-tile character support and unlimited asset generation.

Grid Master: Technical Architecture Overview
Core Application Structure: The GridMasterApp class serves as the main orchestrator, managing the Konva.js stage and coordinating between specialized subsystems. This central class initializes the canvas, manages layers (background, grid, characters), and handles the primary event loop.
Character Management System: The CharacterPlacer class handles all character-related operations including placement validation, collision detection, and multi-tile character support. It maintains a registry of PlacedCharacter objects, each containing position data, size information, and references to their Konva visual elements. The CharacterTemplate interface defines reusable character blueprints, while CharacterInstance represents actual placed characters on the grid.
Grid Infrastructure: Core types include GridPosition for tile coordinates, CharacterSize for multi-tile dimensions, and GridConfig for customizable grid properties. The coordinate system seamlessly converts between pixel positions and grid tiles, enabling precise character placement and drag-and-drop functionality.
Canvas Rendering: Built on Konva.js layer architecture - backgroundLayer for solid colors, gridLayer for visual grid lines, and characterLayer for all character objects. Each character renders as a Konva.Group containing images and visual indicators.
State Management: The system tracks occupied tiles using efficient Set data structures, maintains character relationships through Maps, and provides undo/redo functionality through command pattern implementation. This architecture ensures scalable performance even with hundreds of characters.

## **Grid Master: Developer Contribution Guide**

**Development Environment:** Project uses TypeScript with Vite for fast development builds and hot module replacement. No complex framework dependencies - just vanilla TypeScript with Konva.js for canvas manipulation. Standard npm workflow: `npm install` then `npm run dev` for local development server.

**Code Organization:** All source files live in `/src` with modular TypeScript classes. Main entry point is `main.ts` containing the application bootstrapping and primary game loop. Character management logic is isolated in dedicated classes for easy testing and extension.

**Key Patterns:** Uses composition over inheritance - characters are data objects with attached Konva visual components rather than heavy class hierarchies. Event-driven architecture with clear separation between UI interactions and game logic. Immutable position updates prevent state corruption during drag operations.

**Testing Strategy:** Unit tests focus on grid coordinate calculations, character placement validation, and collision detection algorithms. Canvas rendering is tested through integration tests verifying visual state matches logical state.

**Contribution Areas:** Character AI integration (API calls), file upload handling, advanced character templates, mobile touch optimization, collaborative editing features, and performance optimization for large grids. Each area has clear interfaces and can be developed independently.

**Performance Considerations:** Konva objects are pooled and reused. Grid calculations use efficient Set/Map structures. Large character movements batch updates to prevent rendering thrash.

Grid Master - Complete System Architecture
Project Structure Overview
src/
├── main.ts                     # Application entry point
├── GridMaster.ts               # Main orchestrator class
├── types.ts                    # All TypeScript interfaces & enums
├── grid/
│   ├── GridRenderer.ts         # Grid rendering & coordinates
│   └── GridState.ts           # Tile occupation & collision
├── ui/
│   ├── EventManager.ts        # Canvas event handling
│   └── Sidebar.ts             # UI controls & interactions
└── test/
    ├── setup.ts               # Test environment setup
    ├── types.test.ts          # Type validation tests
    ├── GridMaster.test.ts     # Main class tests
    ├── grid-system.test.ts    # Grid classes tests
    └── ui-components.test.ts  # UI classes tests

Core Type System (types.ts)
Basic Types

GridPosition - Grid coordinates {x, y}
ObjectSize - Object dimensions {width, height}
PixelPosition - Canvas pixel coordinates
GridConfig - Grid appearance settings

Key Enums
typescriptObjectType = CHARACTER | TERRAIN | SPELL | EFFECT | PROP | VEHICLE
ZLayer = TERRAIN(0) | VEHICLES(100) | PROPS(200) | EFFECTS(300) | CHARACTERS(400) | PROJECTILES(500) | UI(1000)
ToolMode = PLACE | SELECT | DELETE | MOVE
Object System

GridObjectTemplate - Blueprint for creating objects
GridObjectInstance - Actual placed object with position/z-index
AppState - Complete application state
DragState - Drag operation tracking

Helper Functions

getDefaultZIndex(type) - Returns appropriate z-layer for object type


Grid System Classes
GridRenderer (grid/GridRenderer.ts)
Purpose: Handles all grid rendering, coordinate conversion, and visual management
Key Methods:

pixelToGrid(pixel) → GridPosition - Convert canvas pixels to grid coordinates
gridToPixel(grid) → PixelPosition - Convert grid to canvas pixels
snapToGrid(pixel) → PixelPosition - Snap coordinates to grid
isValidGridPosition(pos) → boolean - Check bounds
isValidGridArea(pos, w, h) → boolean - Check if area fits
drawGrid() / hideGrid() - Grid visibility
getOccupiedPositions(pos, size) - Get all tiles an object covers
getGridDistance(pos1, pos2) - Distance between positions
getPositionsInRadius(center, radius) - Area queries

State: Grid layers (background, grid lines), canvas dimensions, grid configuration
GridState (grid/GridState.ts)
Purpose: Manages tile occupation, collision detection, z-index conflicts
Key Methods:

placeObject(id, pos, size, zIndex, type) → boolean - Place with collision check
removeObject(id) → boolean - Remove from grid
moveObject(id, newPos) → boolean - Move with collision check
canPlaceObject(pos, size, zIndex, excludeId?) → boolean - Check placement validity
getObjectAtPosition(pos) - Get top object at position
getAllObjectsAtPosition(pos) - Get all objects at position
getObjectsInArea(topLeft, bottomRight) - Area queries
clearAll() - Reset grid state

Collision Rules:

Characters block other characters
Vehicles block other vehicles
Props block vehicles and other props
Terrain blocks everything except effects/projectiles
Effects and projectiles don't block anything

Internal Storage:

Map<string, OccupationInfo[]> - Tile occupation by position key
Map<string, GridPosition> - Object positions
Map<string, ObjectSize> - Object sizes


Main Orchestrator
GridMaster (GridMaster.ts)
Purpose: Main application class that coordinates all subsystems
Dependencies:

Uses GridRenderer for all rendering operations
Uses GridState for collision detection and object tracking
Manages Konva stage and layers

Key Methods:

setTool(tool) - Change current tool
toggleGrid() - Show/hide grid
clearAll() - Remove all objects
pixelToGrid(pixel) / gridToPixel(grid) - Coordinate conversion (delegates to GridRenderer)
getGridStats() - Statistics from GridState
getAppState() / getGridConfig() - State access (immutable copies)

Object Management (temporary, will be replaced with ObjectManager):

Maintains Map<string, GridObjectInstance> for object data
Maintains Map<string, GridObjectTemplate> for object templates
Maintains Map<string, Konva.Group> for visual representations
Handles drag-and-drop with collision feedback

Event Handling: Basic click detection, delegates to EventManager for advanced interactions

UI System Classes
EventManager (ui/EventManager.ts)
Purpose: Handles all canvas events and user interactions
Constructor Requirements:
typescriptnew EventManager(stage, gridRenderer, gridState, appState, callbacks)
Key Features:

Click Detection: Distinguishes object clicks vs empty space
Tool-Aware Behavior: Different actions based on current tool
Cursor Management: Changes cursor based on context and tool
Drag System: Complete drag-and-drop with visual feedback
Context Info: Right-click shows object details

Callback Interface:
typescriptEventManagerCallbacks {
  onToolAction(tool, position, target?)
  onObjectSelected(objectId)
  onObjectDeselected()
  onObjectMoved(objectId, oldPos, newPos) → boolean
  onDragStart/onDragEnd(objectId, position, success?)
}
Public Methods:

setTool(tool) - Update tool and object interactivity
setupObjectDragHandlers(konvaObject, objectId) - Enable dragging for objects
getCurrentGridPosition() - Mouse position as grid coordinates
isValidPlacement(pos, w, h) - Placement validation

Sidebar (ui/Sidebar.ts)
Purpose: Manages all sidebar UI controls and interactions
Constructor Requirements:
typescriptnew Sidebar(callbacks: SidebarCallbacks)
Key Features:

Tool Management: Visual feedback for active tools
Size Selection: Multi-size object support with visual selection
File Upload: Drag & drop with validation (PNG, JPG, etc., max 10MB)
AI Generation: Mock AI with realistic delays and feedback
Grid Controls: Zoom, reset, clear with confirmation
Status System: User feedback with auto-hide timers
Keyboard Shortcuts: P/S/D/M for tools, Ctrl+G for grid, etc.

Callback Interface:
typescriptSidebarCallbacks {
  onToolChanged(tool)
  onSizeChanged(size)
  onFileUpload(files)
  onAIGenerate(prompt, size, type)
  onGridToggle()
  onZoomIn/Out()
  onResetView()
  onClearAll()
}
Public Methods:

setToolFromExternal(tool) - External tool changes
updateCharacterLibrary(characters[]) - Dynamic library updates
showStatus(message, type) - User feedback
enableGenerateButton() / disableGenerateButton() - AI generation state
setupKeyboardShortcuts() - Global keyboard handling


Application Entry Point
EnhancedGridMasterApp (main.ts)
Purpose: Application initialization and coordination between all systems
Initialization Flow:

Creates GridMaster with configuration
Creates EventManager with callbacks
Creates Sidebar with callbacks
Sets up global keyboard shortcuts
Handles responsive behavior

Key Integration Points:

Tool Changes: Updates both GridMaster and EventManager
File Processing: Validates, loads, and adds to character library
AI Generation: Simulates AI with realistic delays and name generation
Status Management: Centralized user feedback system

Debug Features:

Global window.gridApp access
Ctrl+I for grid statistics
Ctrl+/ for keyboard shortcuts help


Test System
Test Structure

Unit Tests: Individual class functionality
Integration Tests: Class interactions
Mocking: Complete Konva mocking to avoid canvas dependencies

Key Test Files:

types.test.ts - Type validation and helper functions
GridMaster.test.ts - Main class functionality
grid-system.test.ts - GridRenderer + GridState (32 tests)
ui-components.test.ts - EventManager + Sidebar functionality

Mock System (test/setup.ts):
typescript// Mocks Konva completely
vi.mock('konva', () => ({
  Stage: vi.fn(() => mockStage),
  Layer: vi.fn(() => mockLayer),
  Rect: vi.fn(() => mockRect),
  Line: vi.fn(() => mockLine)
}))

Key Design Patterns
Separation of Concerns

GridRenderer: Pure rendering and coordinate math
GridState: Pure state management and collision logic
EventManager: Pure event handling and user interaction
Sidebar: Pure UI control management
GridMaster: Orchestration and object lifecycle

Callback Pattern
All UI classes use callback interfaces for loose coupling
Immutable State

getAppState() and getGridConfig() return copies
Prevents external mutation of internal state

Z-Index Management

Layered collision detection based on object types
Visual z-ordering matches logical z-layers

Error Handling

Graceful degradation in test environments
Validation at multiple levels (UI, logic, rendering)


Future Extension Points
Ready for Phase 5:

ObjectManager: Replace temporary object management in GridMaster
ObjectRenderer: Dedicated object rendering with image support
Advanced Features: Copy/paste, object grouping, property editing

Architecture Benefits:

Modular: Each class has single responsibility
Testable: Comprehensive test coverage with mocking
Extensible: Clear interfaces for adding features
Maintainable: Clean separation allows independent changes

This architecture provides a solid foundation for building a professional grid-based application with room for significant expansion while maintaining code quality and testability.