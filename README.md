# grid

Grid Master: AI-Powered Character Placement Tool
The Problem: Traditional grid-based games and tabletop RPGs rely on pre-made character assets, limiting creativity and forcing players to settle for "close enough" representations of their vision.
Our Solution: Grid Master revolutionizes character placement by combining AI image generation with intuitive grid-based gameplay. Users can generate custom characters through natural language prompts ("a fierce orc warrior with glowing eyes") or upload their own images, then place them on intelligent grids that handle multi-tile characters, collision detection, and drag-and-drop movement.
Key Innovation: Unlike existing battle map tools that only work with developer-created sprites, Grid Master creates infinite, personalized content on-demand. Every character is unique and exactly what the user envisioned.
Tech Stack: Built with TypeScript and Konva.js for high-performance canvas rendering, ensuring smooth character manipulation even with hundreds of pieces. The frontend handles complex grid logic, multi-tile character management, and real-time interactions. Backend integration with AI APIs (OpenAI/Midjourney) for character generation, with plans for Flask server deployment for familiar Python development.
Market Opportunity: Targets tabletop gamers, game masters, content creators, and educators who need custom visual assets. The rise of online RPGs and AI image generation creates perfect timing for this innovative tool.
Competitive Advantage: First-to-market AI-integrated grid system with true multi-tile character support and unlimited asset generation.
# Grid Master - Architecture Documentation

## Overview

Grid Master is a TypeScript-based grid system for interactive object placement and manipulation, built with Konva.js for high-performance canvas rendering. The architecture separates concerns into distinct, testable components while maintaining a unified object management system.

## Core Architecture Principles

### 1. Single Source of Truth
- **GridMaster** is the central orchestrator for all object management
- All objects use the unified **GridObject** system for consistent behavior
- **GridState** maintains the authoritative spatial data structure

### 2. Separation of Concerns
- **Rendering**: GridRenderer handles all visual grid operations
- **State Management**: GridState manages spatial relationships and collision detection
- **Object Behavior**: GridObject encapsulates individual object logic
- **User Interaction**: EventManager handles input and tool coordination
- **UI Controls**: Sidebar manages user interface elements

### 3. Event-Driven Communication
- Components communicate through callback interfaces
- Loose coupling enables independent testing and modification
- Clear data flow from user actions to visual updates

## Component Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   main.ts       │    │   Sidebar.ts     │    │ EventManager.ts │
│ (Orchestrator)  │◄──►│ (UI Controls)    │◄──►│ (Input Handler) │
└─────────┬───────┘    └──────────────────┘    └─────────┬───────┘
          │                                              │
                    ▼                                              ▼
                    ┌─────────────────────────────────────────────────────────────────┐
                    │                    GridMaster.ts                                │
                    │                  (Central Coordinator)                         │
                    ├─────────────────┬─────────────────┬─────────────────┬─────────┤
                    │   GridRenderer  │   GridState     │   GridObject    │ PlaceTool│
                    │   (Visuals)     │   (Spatial)     │   (Behavior)    │ (Logic) │
                    └─────────────────┴─────────────────┴─────────────────┴─────────┘
                              │                 │                 │             │
                                        ▼                 ▼                 ▼             ▼
                                        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
                                        │ Konva.js Canvas │ │ Collision Maps  │ │ Konva.Groups    │ │ Template System │
                                        └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
                                        ```

                                        ## Core Components

                                        ### GridMaster (Central Orchestrator)

                                        **Responsibilities:**
                                        - Application lifecycle management
                                        - Object creation and destruction coordination
                                        - Tool state management
                                        - Public API for external interactions

                                        **Key Methods:**
                                        ```typescript
                                        // Object Management
                                        placeObjectFromTemplate(template: GridObjectTemplate, position: GridPosition): boolean
                                        addExistingObject(instance: GridObjectInstance, template: GridObjectTemplate): boolean
                                        removeObject(objectId: string): boolean
                                        moveObject(objectId: string, newPosition: GridPosition): boolean

                                        // Template Management
                                        addTemplate(template: GridObjectTemplate): void

                                        // Tool Management
                                        setTool(tool: ToolMode): void
                                        ```

                                        **Object Tracking:**
                                        - `Map<string, GridObject>` - Active objects with visual representation
                                        - `Map<string, GridObjectTemplate>` - Available object templates
                                        - `Set<string>` - Currently selected object IDs

                                        ### GridObject (Individual Object Management)

                                        **Responsibilities:**
                                        - Self-contained object state and behavior
                                        - Konva visual representation management
                                        - Drag-and-drop interaction handling
                                        - Visual feedback (selection, drag states)

                                        **Lifecycle:**
                                        ```typescript
                                        constructor(template, position, gridMaster) // Create visual representation
                                        setupEventHandlers()                        // Attach drag/interaction handlers
                                        destroy()                                   // Clean up Konva objects
                                        ```

                                        **Key Features:**
                                        - **Self-rendering**: Creates own Konva.Group with fallback visuals
                                        - **Interactive behavior**: Handles own drag events with grid snapping
                                        - **State synchronization**: Updates GridMaster and GridState during moves
                                        - **Visual feedback**: Selection highlights and drag validation colors

                                        ### GridState (Spatial Data Management)

                                        **Responsibilities:**
                                        - Tile occupation tracking
                                        - Collision detection
                                        - Spatial queries and validation
                                        - Z-layer conflict resolution

                                        **Data Structures:**
                                        ```typescript
                                        Map<string, OccupationInfo[]>  // Position-based object lookup
                                        Map<string, GridPosition>      // Object position tracking  
                                        Map<string, ObjectSize>        // Object size tracking
                                        ```

                                        **Collision Rules:**
                                        - Characters block other characters
                                        - Vehicles block other vehicles  
                                        - Props block vehicles and other props
                                        - Terrain blocks everything except effects/projectiles
                                        - Effects and projectiles don't block anything

                                        ### GridRenderer (Visual Grid Management)

                                        **Responsibilities:**
                                        - Grid line rendering and visibility
                                        - Coordinate system conversion
                                        - Canvas size management
                                        - Background rendering

                                        **Coordinate System:**
                                        ```typescript
                                        pixelToGrid(pixel: PixelPosition): GridPosition     // Canvas → Grid
                                        gridToPixel(grid: GridPosition): PixelPosition      // Grid → Canvas  
                                        gridToPixelCenter(grid: GridPosition): PixelPosition // Grid → Centered
                                        snapToGrid(pixel: PixelPosition): PixelPosition     // Snap to nearest
                                        ```

                                        ### PlaceTool (Placement Logic)

                                        **Responsibilities:**
                                        - Template management and validation
                                        - Placement rule enforcement
                                        - Weight-based stacking validation
                                        - Object property management

                                        **Integration with GridMaster:**
                                        ```typescript
                                        // PlaceTool Flow:
                                        1. validatePlacement(position, template) → PlacementValidation
                                        2. attemptPlacement(position) → places in GridState
                                        3. onObjectPlaced(instance) → callback to main.ts
                                        4. main.ts → gridMaster.addExistingObject() → creates GridObject
                                        ```

                                        ### EventManager (Input Coordination)

                                        **Responsibilities:**
                                        - Canvas event handling (click, drag, keyboard)
                                        - Tool-specific behavior routing
                                        - Cursor management
                                        - Object selection coordination

                                        **Tool Modes:**
                                        - **PLACE**: Coordinate with PlaceTool for object placement
                                        - **SELECT**: Object selection and highlighting
                                        - **DELETE**: Object removal coordination
                                        - **MOVE**: Enable/disable object draggability

                                        ### Sidebar (UI Controls)

                                        **Responsibilities:**
                                        - Tool selection interface
                                        - File upload handling
                                        - AI generation interface (mock)
                                        - Character library management
                                        - Grid control buttons

                                        **Event Flow:**
                                        ```typescript
                                        User Interaction → Sidebar → Callback → main.ts → GridMaster → Visual Update
                                        ```

                                        ## Data Flow Architecture

                                        ### Object Placement Flow
                                        ```
                                        1. User clicks canvas in PLACE mode
                                        2. EventManager → handleToolAction(PLACE, position)
                                        3. main.ts → handleToolAction() → gridMaster.placeObjectFromTemplate()
                                        4. GridMaster → new GridObject() + gridState.placeObject()
                                        5. GridObject → creates Konva visual + event handlers
                                        6. Canvas updates with new object
                                        ```

                                        ### Object Movement Flow
                                        ```
                                        1. User drags object (MOVE mode enabled)
                                        2. GridObject.dragstart → store original position
                                        3. GridObject.dragmove → live grid snapping + collision feedback
                                        4. GridObject.dragend → gridMaster.moveObject()
                                        5. GridMaster → gridState.moveObject() + visual position update
                                        6. GridObject → snap to final grid position
                                        ```

                                        ### Object Deletion Flow
                                        ```
                                        1. User clicks object in DELETE mode
                                        2. EventManager → findObjectIdFromTarget() → handleToolAction(DELETE, id)
                                        3. main.ts → gridMaster.removeObject()
                                        4. GridMaster → gridState.removeObject() + gridObject.destroy()
                                        5. Visual object removed from canvas
                                        ```

                                        ## Layer Architecture (Konva)

                                        **Rendering Order (bottom to top):**
                                        ```typescript
                                        1. backgroundLayer    // Grid background (GridRenderer)
                                        2. gridLayer         // Grid lines (GridRenderer) 
                                        3. objectLayer       // Game objects (GridMaster)
                                        4. uiLayer          // Selection indicators (GridMaster)
                                        ```

                                        **Z-Index Management:**
                                        ```typescript
                                        ZLayer.TERRAIN = 0      // Floor, pits
                                        ZLayer.VEHICLES = 100   // Carts, mounts
                                        ZLayer.PROPS = 200      // Furniture, rocks
                                        ZLayer.EFFECTS = 300    // Spell areas
                                        ZLayer.CHARACTERS = 400 // Players, NPCs
                                        ZLayer.PROJECTILES = 500// Flying spells
                                        ZLayer.UI = 1000       // Selection, health bars
                                        ```

                                        ## State Management

                                        ### Application State
                                        ```typescript
                                        interface AppState {
                                          gridConfig: GridConfig           // Grid appearance settings
                                            currentTool: ToolMode           // Active user tool
                                              dragState: DragState            // Drag operation tracking
                                                selectionState: SelectionState  // Selected objects
                                                  showGrid: boolean               // Grid visibility
                                                    snapToGrid: boolean             // Snap behavior
                                                    }
                                                    ```

                                                    ### Object Instance State
                                                    ```typescript
                                                    interface GridObjectInstance {
                                                      id: string                    // Unique identifier
                                                        templateId: string           // Template reference
                                                          position: GridPosition       // Current grid location
                                                            zIndex: number              // Rendering layer
                                                              rotation?: number           // Object rotation
                                                                opacity?: number           // Object transparency
                                                                  customData?: Record<string, any> // Extended properties
                                                                    createdAt: Date            // Creation timestamp
                                                                    }
                                                                    ```

                                                                    ## Integration Points

                                                                    ### PlaceTool Integration
                                                                    - **Template Management**: PlaceTool manages available templates
                                                                    - **Placement Logic**: PlaceTool handles validation and rules
                                                                    - **Visual Creation**: GridMaster creates GridObject for placed instances
                                                                    - **Coordination**: Callback system bridges logical and visual placement

                                                                    ### File Upload Integration
                                                                    ```typescript
                                                                    1. Sidebar handles file upload UI
                                                                    2. main.ts processes files → creates templates
                                                                    3. Templates added to both PlaceTool and GridMaster
                                                                    4. Character library updated with new options
                                                                    ```

                                                                    ### AI Generation Integration (Mock)
                                                                    ```typescript
                                                                    1. Sidebar captures user prompt
                                                                    2. main.ts simulates AI delay
                                                                    3. Generated template added to system
                                                                    4. Available for placement like uploaded characters
                                                                    ```

                                                                    ## Testing Architecture

                                                                    ### Component Testing
                                                                    - **GridRenderer**: Coordinate conversion, bounds validation
                                                                    - **GridState**: Collision detection, spatial queries
                                                                    - **GridObject**: Visual creation, event handling
                                                                    - **PlaceTool**: Placement validation, template management

                                                                    ### Integration Testing
                                                                    - **Object Lifecycle**: Create → Move → Delete
                                                                    - **Tool Coordination**: Mode switching, behavior changes
                                                                    - **File Processing**: Upload → Template Creation → Placement

                                                                    ### Mock System
                                                                    - **Konva Mocking**: Complete canvas API mocking for headless testing
                                                                    - **File API Mocking**: FileReader and upload simulation
                                                                    - **Event Simulation**: Mouse and keyboard event testing

                                                                    ## Performance Considerations

                                                                    ### Efficient Rendering
                                                                    - **Layer Separation**: Objects only redraw when modified
                                                                    - **Z-Index Management**: Minimal layer reorganization
                                                                    - **Event Optimization**: Direct object event handlers vs. stage delegation

                                                                    ### Memory Management
                                                                    - **Object Cleanup**: Explicit destroy() methods prevent memory leaks
                                                                    - **Template Reuse**: Single template → multiple instances
                                                                    - **Map-based Tracking**: O(1) object lookup performance

                                                                    ### Scalability
                                                                    - **Grid Partitioning**: Ready for spatial indexing if needed
                                                                    - **Batch Operations**: Object groups for large operations
                                                                    - **Lazy Loading**: Template and asset loading on demand

                                                                    ## Extension Points

                                                                    ### New Object Types
                                                                    1. Add to `ObjectType` enum and `ZLayer` mapping
                                                                    2. Define collision rules in `GridState.hasZLayerConflict()`
                                                                    3. Add visual styling in `GridObject.createFallbackVisual()`
                                                                    4. Create template in PlaceTool system

                                                                    ### New Tools
                                                                    1. Add to `ToolMode` enum
                                                                    2. Implement behavior in `EventManager.handleToolAction()`
                                                                    3. Add UI controls in `Sidebar`
                                                                    4. Update object interaction logic in `GridObject`

                                                                    ### Advanced Features
                                                                    - **Multi-selection**: Extend `SelectionState` and selection logic
                                                                    - **Copy/Paste**: Template serialization and batch placement
                                                                    - **Undo/Redo**: Command pattern implementation
                                                                    - **Real AI Integration**: Replace mock generation with actual API calls
                                                                    - **Multiplayer**: Event synchronization and conflict resolution

                                                                    ## Error Handling

                                                                    ### Validation Layers
                                                                    1. **UI Validation**: Sidebar input validation
                                                                    2. **Logic Validation**: PlaceTool placement rules
                                                                    3. **State Validation**: GridState collision detection
                                                                    4. **Visual Validation**: GridObject bounds checking

                                                                    ### Recovery Mechanisms
                                                                    - **Failed Placement**: Visual feedback, revert to previous state
                                                                    - **Invalid Moves**: Automatic snap-back to valid position
                                                                    - **Template Errors**: Fallback visuals for missing assets
                                                                    - **Event Errors**: Graceful degradation, user notification

                                                                    This architecture provides a robust, scalable foundation for grid-based object management while maintaining clear separation of concerns and consistent user experience across all object types and interactions.