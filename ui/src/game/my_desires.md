# Asset Source Processing Implementation Plan

## Overview

Build a complete asset creation system that replaces direct sprite references with procedurally generated assets. Every asset that gets rendered must go through this asset creation system - no more placing raw sprites directly. Artists' source images become raw material that gets processed into mathematically precise, game-ready assets.

## What Gets Preserved Completely

Your entire existing positioning system stays exactly as it is. Every single field in DirectionalSpriteSettings remains unchanged and functional. The invisible margins, the auto-computed vertical bias using your formula, the manual overrides, the wall-relative positioning with your perfect A equals eight B equals three system, the sprite trimming with computed bounding boxes, the shared versus per-direction settings, the JSON persistence - all of this continues working identically.

The only change is that instead of positioning raw sprites, your positioning system now positions processed assets that were created through the asset creation interface.

## Asset Creation System

### Asset Identity and Categorization

Every processed asset has a unique identifier, a human readable name, and belongs to one of three categories: tile, wall, or stair. Tiles are things that occupy the center of grid cells like floors, full blocks, decorations. Walls are things that attach to the edges of grid cells like walls, doors, windows, fences. Stairs are internal objects that create connections between Z layers.

Each asset has a version number for managing changes over time and belongs to subcategories within its main category for organization.

### Source Image Processing

Instead of pointing directly to a sprite file, each asset defines how to extract and modify content from source images. You specify a source image path, then define a sequence of processing operations that transform that source into the final asset.

Processing operations include cropping rectangular regions from the source image, resizing to specific pixel dimensions or grid-relative sizes, mirroring horizontally or vertically, rotating in ninety degree increments, and applying filters like brightness or contrast adjustments.

You can crop a small section from a large sprite sheet, resize it to fit your four hundred pixel grid mathematical constraints, mirror it to create variations, and apply color adjustments. Multiple assets can reference the same source image with different processing operations.

### Directional Behavior System

This extends your existing shared versus per-direction settings system. Each asset can use shared settings that apply to all four directions, or per-direction settings that allow different behavior for north, east, south, and west orientations.

For shared settings, you define the behavior once and it applies to all directions. For per-direction settings, you can configure each of the four directions independently. This lets you handle complex sprites that need different positioning or properties depending on which direction they face.

All of your existing DirectionalSpriteSettings fields are available in both modes. The invisible margins, vertical bias calculation, wall-relative positioning, sprite trimming - everything you built continues working within this system.

### Anchor and Grid Attachment System

This is new functionality that extends your positioning system. Each asset defines how it anchors to the grid and how it attaches to different parts of the grid cell.

For anchoring, you can choose center anchoring where the asset's center point aligns with a specific grid location, edge anchoring where a specific edge of the asset aligns with grid features, corner anchoring where a corner of the asset aligns with grid corners, or custom anchoring where you specify exactly which point within the asset serves as the anchor using normalized coordinates.

For grid attachment, tiles attach to the center of grid cells with either above or below snap positioning. Walls attach to the edges of grid cells specifying which edge and how they align along that edge. Stairs attach to internal positions within grid cells using normalized coordinates to specify exactly where within the cell they sit.

### Gameplay Properties System

This is the new four-quadrant system that replaces single boolean flags. Each asset defines how it affects the four quadrants of its grid cell and the eight edge segments that connect to adjacent cells.

For quadrant properties, each of the four quadrants can be walkable or blocked, can block vision or allow vision, can have elevation changes for height variations, and can have terrain types for different movement costs or gameplay effects.

For edge properties, each of the eight edge segments can allow or block crossing into adjacent cells, can have different movement costs for pathfinding, can block or allow vision across the edge, and can have edge types that define what kind of barrier or opening they represent.

### Z Property Contribution System

Each asset contributes Z properties to the grid cell based on its snap position and category. Assets snapped below contribute surface Z properties that define the walkable terrain and base elevation of the grid cell. Assets snapped above contribute elevated Z properties that define blocking geometry and elevated terrain above the base level.

Surface Z properties include the base elevation of each quadrant, the terrain type for movement calculations, and whether each quadrant provides stable footing for entities. These properties get combined when multiple below-snapped assets occupy the same cell.

Edge Z properties define how the asset affects movement and vision across the borders between grid cells. Walls contribute edge blocking properties that prevent movement across specific edge segments. Doors contribute conditional edge properties that allow movement under certain conditions. Windows contribute vision-permeable edge properties that block movement but allow line of sight.

Elevated Z properties define geometry that exists above the base grid level. This includes blocking volumes that prevent movement through specific quadrants at elevated levels, elevated platforms that provide walkable surfaces above the base level, and vertical connectors like stairs that allow movement between different Z levels.

The Z property system ensures that when you stack assets vertically using above and below snap positions, the result is a complete three-dimensional definition of the grid cell with proper surface properties, edge blocking, and elevated geometry. This guarantees that the grid cell provides all necessary information for pathfinding, line of sight calculations, and three-dimensional entity placement.

### Direction Conditional Properties

Both the directional behavior and the gameplay properties can be direction conditional. This means a wall asset might have different gameplay properties when placed on the north edge versus the south edge. The door opening direction problem gets solved here - a door asset can have different edge crossing properties depending on which direction it faces.

You can define shared properties that apply regardless of direction, or per-direction properties that change based on the asset's orientation. This lets you handle complex cases like doors that open in different directions or walls that have different blocking patterns depending on their orientation.

## Asset Creation Interface

### Source Image Selection

The interface presents a visual browser of all available source images organized by category and type. Artists upload source images to specific directories and the system automatically discovers them. You can preview each source image, see its dimensions, and select it as the base for your asset.

Source images can be individual sprites, sprite sheets with multiple assets, or large composite images that contain many different elements. The system handles all formats that browsers support.

### Visual Processing Operations Editor

This provides a live preview of your asset as you apply processing operations. You see the source image, apply a crop operation and immediately see the cropped result, apply a resize and see the resized result, apply mirroring and see the mirrored result.

For cropping, you can drag to select rectangular regions, enter precise pixel coordinates, or use percentage-based selections. For resizing, you can specify exact pixel dimensions, use grid-relative sizing that automatically calculates appropriate dimensions for your four hundred pixel grid, or use aspect-ratio-preserving scaling.

For mirroring and rotation, you get immediate visual feedback showing the transformed result. For filters, you get sliders that show real-time preview of brightness, contrast, saturation, or hue adjustments.

Operations apply in sequence, so you can crop first, then resize, then mirror, and see the cumulative effect. You can reorder operations, modify parameters of existing operations, or remove operations from the sequence.

### Directional Configuration Editor

This extends your existing configuration panel to handle processed assets. You get the same toggle between shared and per-direction settings that you have now. When using shared settings, you configure once and it applies to all directions. When using per-direction settings, you select which direction you're configuring and can switch between north, east, south, and west to configure each independently.

All of your existing positioning controls are available. The invisible margins, the auto-computed versus manual vertical bias, the wall-relative positioning controls, the sprite trimming toggle - everything you built is accessible through this interface.

The new anchor strategy selector lets you choose how the asset anchors to the grid. The grid attachment editor lets you specify exactly how the asset connects to grid features. These new controls integrate seamlessly with your existing positioning system.

### Gameplay Properties Editor

This provides visual editors for defining the four-quadrant properties and eight edge segment properties. For quadrants, you get a visual grid showing the four quadrants where you can click to toggle walkability, vision blocking, and other properties for each quadrant independently.

For edge properties, you get a visual representation of the eight edge segments around the grid cell perimeter where you can configure crossing permissions, movement costs, and vision blocking for each segment.

For stairs, you get a Z portal editor where you can define connections between quadrants on different Z layers. You specify the source quadrant, the target cell and quadrant, and whether the connection is bidirectional.

When using per-direction properties, you can configure these properties differently for each direction the asset faces. This lets you handle complex cases like doors that allow different movement patterns depending on their orientation.

### Live Preview System with Grid Snapping Verification

As you configure the asset, you see a live preview showing how it will appear positioned on an actual isometric grid. The preview renders a visible grid with the four hundred pixel diamond cells and shows your asset positioned according to its snap configuration. This is critical for ensuring perfect snapping above and below the grid level.

The preview shows both the "below" snap position where the asset sits on the grid diamond surface, and the "above" snap position where the asset hovers above the grid diamond. You can toggle between these positions to see exactly how the asset aligns with the grid geometry.

For each snap position, the preview shows how the asset affects Z properties. Assets snapped below contribute surface properties to the grid cell - they define what you can walk on and what terrain exists at that grid level. Assets snapped above contribute elevated properties - they define blocking or elevated terrain that exists above the base grid level.

The preview uses your existing rendering system with actual grid diamonds, Z layer offsets, and positioning calculations. You see exactly how the invisible margins, vertical bias, and anchor positioning affect the final placement. You can rotate the preview to see all four directions, place multiple copies to test adjacency behavior, and verify that the asset snaps precisely to grid positions without floating or clipping incorrectly.

The grid preview also shows how the asset's four-quadrant properties affect the grid cell. Visual overlays highlight which quadrants become walkable or blocked, which edge segments allow or restrict movement, and how Z portals connect between layers.

## Renderer Integration

### Processed Asset Manager

The system includes a new asset manager that handles loading and caching processed assets. When the renderer needs an asset, it requests it by processed asset ID rather than sprite name. The asset manager loads the asset definition, applies all processing operations, and returns the final texture ready for rendering.

Processing results get cached so repeated requests for the same asset are fast. The cache handles different directions for directional assets and invalidates appropriately when asset definitions change.

### Renderer Enforcement

Your existing IsometricTileRenderer gets modified to only accept processed asset IDs. The old sprite name fields become deprecated and the renderer logs warnings for any assets that don't have processed asset IDs.

All new assets must go through the asset creation system. This ensures consistency and prevents artists from bypassing the mathematical constraints and gameplay property system.

### Backward Compatibility During Transition

During the transition period, the system includes automatic migration that converts existing sprite references to basic processed assets. These migrated assets use the original sprite directly with no processing operations, but they get proper asset IDs and basic gameplay properties inferred from their current settings.

This lets you gradually convert assets to use processing operations and enhanced properties without breaking existing content.

## Valtio Integration and State Management

### Asset Configuration Storage in Valtio

Each processed asset configuration becomes a typed object stored in the Valtio store. The tile renderer uses these Valtio-stored configurations to understand positioning, anchoring, and property contributions. This integrates seamlessly with your existing sophisticated subscription system that avoids infinite rendering loops.

The asset configurations are stored in a dedicated section of the battlemap store, organized by asset ID. When the renderer needs an asset's configuration, it reads directly from the Valtio store without triggering new subscriptions during the render cycle. This preserves your existing performance optimizations.

All viewpoints and directions of the same asset share the same base configuration object. The directional behavior system determines whether shared or per-direction settings apply, but the storage remains unified per asset. This ensures consistency and prevents duplication of configuration data.

### Fine-Grained Subscription Management

The asset configuration UI components use fine-grained Valtio subscriptions to specific parts of the asset configuration state. Instead of subscribing to the entire asset object, components subscribe only to the specific properties they need to render.

For example, the positioning controls component subscribes only to the positioning section of the asset configuration. The gameplay properties editor subscribes only to the quadrant and edge properties. This prevents unnecessary re-renders when unrelated parts of the configuration change.

The subscription system includes careful handling of temporary asset states during editing. Temporary assets exist in a separate part of the Valtio store that doesn't trigger renderer updates until the user explicitly saves the asset configuration.

### Configuration State Types

The Valtio store includes strongly typed interfaces for all asset configuration data. This ensures type safety throughout the rendering and editing pipeline and provides clear contracts for how different parts of the system interact with asset configurations.

## Asset Preview Rendering System

### Popup Preview Window

The asset configuration interface includes a preview window that pops up at the center of the screen showing a three by three isometric grid. This preview uses your existing grid renderer to draw actual grid diamonds with the configured asset positioned at the center grid cell.

The preview window maintains its own camera state separate from the main editor. You can move the preview grid using WASD keys and zoom in and out to examine fine positioning details. This lets you verify exact positioning without affecting the main editor view.

The preview renders using the same IsometricGridRenderer and IsometricTileRenderer that the main editor uses. This ensures complete accuracy - you see exactly how the asset will appear in the actual game with identical positioning, scaling, and visual effects.

### Anchor Visualization

The preview window shows visual indicators for three different anchor systems. The grid anchor shows where the asset attaches to the grid geometry using colored markers on the grid diamonds. The sprite anchor shows the anchor point within the sprite texture using crosshairs or markers overlaid on the rendered sprite. The bounding box anchor shows the computed bounding box boundaries and anchor points when sprite trimming is enabled.

These anchor visualizations help you understand exactly how the positioning system works and verify that anchors align correctly with your intended attachment points. You can toggle different anchor visualizations on and off to focus on specific aspects of the positioning.

### Asset Creation and Editing Workflow

When you click create new asset, the system populates a temporary asset configuration with default values and the selected source PNG. You configure this temporary asset using the various editors without affecting any saved assets. The temporary asset appears immediately in the preview window as you make changes.

When you save the asset, the system writes the configuration to JSON and adds it to the Valtio store, making it available in asset selection menus throughout the editor. The temporary asset state gets cleared and the saved asset becomes the active configuration.

For editing existing assets, the system creates a temporary asset populated with the existing asset's configuration. You modify this temporary copy without affecting the original until you save. If you save with the same name, you overwrite the original JSON file and update the Valtio store. If you save with a different name, you create a new asset based on the existing one.

### React Component Architecture with Valtio Subscriptions

The asset configuration interface uses React components with carefully managed Valtio subscriptions to prevent rendering performance issues. Each configuration panel component subscribes to specific slices of the temporary asset state rather than the entire configuration object.

The positioning controls component subscribes only to the positioning section. The gameplay properties editor subscribes only to the quadrant and edge properties sections. The source processing editor subscribes only to the processing operations array. This granular subscription approach ensures components only re-render when their relevant data changes.

Components use the useSnapshot hook with specific property selectors to achieve fine-grained reactivity. The subscription management follows your existing patterns for avoiding infinite rendering loops during store updates.

### Visual Property Editors

#### Edge and Surface Property Editor

The gameplay properties section includes a visual grid editor where you click directly on quadrants and edge segments to configure their properties. The editor shows a representation of the four quadrants as clickable squares and the eight edge segments as clickable lines around the perimeter.

Clicking on a quadrant cycles through walkability states - walkable, blocked, elevated - with visual indicators showing the current state. Clicking on edge segments cycles through crossing permissions - open, blocked, door, window - with different colors and icons indicating each state.

The visual editor updates immediately as you click, showing live preview of how the properties affect the grid cell. You can see blocked areas in red, walkable areas in green, door segments with door icons, and window segments with transparency indicators.

#### Z-Portal Creation Interface

For stairs and other assets that create Z-portals, the interface includes a Z-portal editor with visual quadrant selection. You click "new portal" to start creating a connection, then click on the source quadrant within the current grid cell.

The interface then lets you specify the target cell coordinates and Z level using number inputs or a cell picker tool. You click on the target quadrant to complete the portal definition. The system shows a visual line or arrow indicating the portal connection.

You can create multiple portals per asset for complex stairs or multi-level connectors. Each portal can be configured as bidirectional or unidirectional and can have movement cost modifiers for pathfinding calculations.

## Snap Position Behavior Examples

### Cube Tile Snap Positioning

Consider a cube tile asset that exactly matches the grid size - it has the same footprint as the grid diamond and a height of two hundred pixels in isometric perspective. This cube represents a perfect block that can demonstrate both snap positioning modes clearly.

When you snap the cube below at grid position Z equals zero, X equals zero, Y equals zero, the cube occupies the space between Z minus two hundred and Z zero. Its upper diamond surface sits perfectly at Z zero, flush with the grid level. The cube provides surface properties to the grid cell - entities can walk on its top surface.

When you snap the same cube above at the same grid position, its lower diamond surface sits at Z zero, overlaying perfectly with the grid diamond. The cube now occupies the space between Z zero and Z plus two hundred. It provides elevated properties - blocking geometry that prevents movement through that space above the grid level.

This snap positioning system ensures that below-snapped assets integrate into the grid surface level while above-snapped assets create elevated geometry above the surface. The two-hundred pixel height corresponds to the mathematical height needed for proper isometric visualization at your four hundred pixel grid width.

### Multi-Asset Stacking

You can combine below and above snapped assets in the same grid cell to create complex three-dimensional structures. A below-snapped floor tile provides the base walkable surface. An above-snapped wall section creates blocking geometry above the floor. A below-snapped stair provides both surface properties and Z-portal connections.

The system combines properties from all assets in each snap layer to determine the final grid cell behavior. Surface properties come from below-snapped assets, elevated properties come from above-snapped assets, and the combination defines the complete three-dimensional behavior of the grid cell.

## Storage and Organization

### Asset Definition Storage

Processed asset definitions are stored as JSON files organized by category. Each asset gets its own file containing the complete definition including source processing operations, directional behavior configuration, and gameplay properties.

The file structure mirrors your existing sprite organization but for processed assets. Asset definitions are version controlled and include creation and modification timestamps.

### Source Image Organization

Source images are organized separately from asset definitions. Artists upload source images to category-specific directories and the system automatically discovers them for use in asset creation.

Source images can be reused across multiple assets, so one large sprite sheet might provide source material for dozens of different processed assets.

### Cache Management

Processed textures and computed metadata get cached for performance. The cache system is smart about invalidation - when you modify an asset definition, it automatically regenerates only the affected cached data.

The cache includes processed textures for all directions of directional assets, computed bounding boxes for sprite trimming, and extracted metadata for gameplay properties.

## Migration Strategy

### Gradual Conversion Process

The migration happens gradually over multiple weeks. You start by setting up the asset creation system and begin creating processed assets for new content. Existing content continues working through automatic migration.

As you have time, you use the asset creation interface to properly configure existing assets with processing operations, enhanced anchoring, and detailed gameplay properties. The system tracks which assets have been properly converted versus automatically migrated.

### Validation and Testing

The system includes validation tools that compare the visual and gameplay behavior of migrated assets versus their original sprite-based versions. This helps ensure the migration doesn't break existing content.

You can run side-by-side comparisons showing the old sprite-based rendering versus the new processed asset rendering to verify they match expectations.

## Timeline and Effort

This represents approximately twelve weeks of focused development work. The first few weeks build the core processing engine and basic asset creation interface. The middle weeks add the advanced directional behavior and gameplay properties systems. The final weeks integrate with your existing renderer and build migration tools.

## Visual Explanations

### Grid Cell Quadrant Layout
```
    400px Grid Cell
  ┌─────┬─────┐
  │ TL  │ TR  │  ← Top-Left, Top-Right (100px each)
  ├─────┼─────┤
  │ BL  │ BR  │  ← Bottom-Left, Bottom-Right
  └─────┴─────┘
```

### Edge Segments for Movement/Vision
```
       N1    N2
    ┌─────┬─────┐
 W1 │     │     │ E1
    ├─────┼─────┤
 W2 │     │     │ E2
    └─────┴─────┘
       S1    S2

Each edge has 2 segments
Total: 8 edge segments per cell
```

### Snap Position Effects
```
ABOVE Snap (elevated properties):
     ▲ Asset floating above grid
   ┌─┴─┐
   │ █ │ ← Asset with "above" snap
   └───┘
  ┌─────┐
  │ ◊ ◊ │ ← Grid diamond surface
  └─────┘

BELOW Snap (surface properties):
  ┌─────┐
  │ ◊ █ │ ← Asset integrated into grid surface
  └─────┘

█ = Asset    ◊ = Grid diamond    ▲ = Elevation
```

### Wall Edge Attachment Examples
```
North Wall:              East Wall:
┌─████─┐                ┌─────┐
│     │                │    ██
├─────┤                ├────██
│     │                │    ██
└─────┘                └─────┘

South Wall:              West Wall:
┌─────┐                ┌─────┐
│     │                ██    │
├─────┤                ██────┤
│     │                ██    │
└─████─┘                └─────┘

████ = Wall asset attached to edge
```

### Stair Z-Portal Connections
```
Floor Z=1:                    Floor Z=0:
┌─────┬─────┐                ┌─────┬─────┐
│     │     │                │     │     │
├─────┼─────┤     ↕          ├─────┼─────┤
│  ↑  │     │    Z-Portal     │  ▲  │     │
└─────┴─────┘                └─────┴─────┘

▲ = Stair bottom (Z=0, bottom-left quadrant)
↑ = Stair top (Z=1, top-left quadrant)
↕ = Z-portal connection between layers
```

### Composite Asset (Wall + Door)
```
Single Composite Asset:
┌─████─┐  ← Wall base (z-offset: 0)
│  ██  │  ← Door frame (z-offset: 1, clips into wall)
├──██──┤
│  ██  │
└─████─┘

Instead of separate conflicting assets:
Wall: ┌─████─┐  +  Door: ┌─────┐  = Z-order conflicts
      │     │           │ ██  │    and positioning issues
      └─────┘           └─██──┘
```

### Quadrant Property Examples
```
Floor Tile Properties:        Wall Block Properties:
┌─────┬─────┐                ┌─────┬─────┐
│  W  │  W  │ W=Walkable     │  B  │  B  │ B=Blocked
├─────┼─────┤                ├─────┼─────┤
│  W  │  W  │                │  B  │  B  │
└─────┴─────┘                └─────┴─────┘

Corner Wall Properties:       Door Properties:
┌─────┬─────┐                ┌─────┬─────┐
│  B  │  W  │ Mixed props    │  B  │  B  │ Vision allowed
├─────┼─────┤                ├─────┼─────┤ Movement restricted
│  B  │  W  │                │  B  │  B  │
└─────┴─────┘                └─────┴─────┘

W=Walkable, B=Blocked
```

Each phase builds on the previous and maintains backward compatibility throughout the development process. You can begin using processed assets as soon as the basic system is working and gradually add more sophisticated features over time.