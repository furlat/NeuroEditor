# Legacy Asset Positioning System Removal Plan

## Overview
This document tracks the comprehensive removal of the old manual asset positioning system in preparation for the new diamond-based automated positioning system.

## Search Progress
- **Status**: COMPLETE ✅
- **Files Analyzed**: 30+ files
- **Components Identified**: 200+ legacy components

---

## Components to Remove

### 1. Core Positioning Types & Interfaces
- [ ] **DirectionalSettings interface** - `ui/src/types/battlemap/editor.ts`
  - invisibleMarginUp/Down/Left/Right + autoComputedVerticalBias
  - **DUPLICATED** in `walls.ts` and `isometricEditor.ts` (remove duplicates)
- [ ] **SpriteTypeSettings interface** - `ui/src/types/battlemap/editor.ts`
  - Extends DirectionalSettings with directional overrides
- [ ] **WallPositioningSettings interface** - `ui/src/types/battlemap/editor.ts`
  - Wall-specific positioning extending DirectionalSettings
- [ ] **Legacy types** - `ui/src/types/battlemap_types.ts`
  - readonly invisibleMargin* properties (line 455-458)
- [ ] **Store types** - `ui/src/types/battlemap/store.ts`
  - invisibleMargin* properties with comments (line 58-61)

### 2. Store State & Actions
- [ ] **core.ts** - `ui/src/store/battlemap/core.ts`
  - **State**: invisibleMarginUp/Down/Left/Right (lines 32-35, 77-80)
  - **Actions**: setInvisibleMarginUp/Down/Left/Right (lines 225-239)
- [ ] **isometricEditor.ts** - `ui/src/store/battlemap/isometricEditor.ts`
  - **State**: spriteTypeSettings with DirectionalSettings
  - **Actions**:
    - `setSpriteTypeSettings()` - Manual positioning configuration
    - `setSpriteDirectionalSettings()` - Per-direction overrides
    - `calculateSpriteTypePositioning()` - Complex positioning calculations (lines 233-294)
    - **DEPRECATED**: `setSpritePositioning()`, `calculateSpritePositioning()` (lines 342-379)
- [ ] **walls.ts** - `ui/src/store/battlemap/walls.ts`
  - **Actions**:
    - `setWallPositioningSettings()` - Wall positioning configuration (lines 196-284)
    - `setWallDirectionalSettings()` - Wall directional settings (lines 398+)
    - `calculateWallPositioning()` - Wall-specific calculations (lines 268-284)
- [ ] **index.ts** - `ui/src/store/battlemap/index.ts`
  - DirectionalSettings export (line 26)

### 3. Configuration Management
- [ ] **SpriteConfigurationManager.ts** - `ui/src/services/SpriteConfigurationManager.ts`
  - **Methods**:
    - `createDefaultConfig()` - Creates default DirectionalSettings (lines 303-336)
    - `applySpriteConfiguration()` - Applies positioning to store (multiple occurrences)
    - Default positioning values hardcoded (invisibleMargin: 8)
  - **Complex Logic**: Recalculation with calculateSpriteTypePositioning (lines 149-158, 184-193)

### 4. Vertical Bias System
- [ ] **VerticalBiasComputationMode enum** - DUPLICATED in multiple files:
  - `ui/src/types/battlemap/store.ts` (lines 14-15)
  - `ui/src/store/battlemap/isometricEditor.ts` (lines 6-7)
  - `ui/src/store/battlemap/core.ts` (import, lines 8-9)
- [ ] **Vertical Bias Properties**:
  - **Types**: `autoComputedVerticalBias`, `useAutoComputed`, `manualVerticalBias`
  - **State**: `verticalBiasComputationMode` in core store (lines 40, 89)
  - **Actions**: `setVerticalBiasComputationMode()` in core.ts (lines 337-339)
- [ ] **Computation Logic**:
  - `calculateSpriteTypePositioning()` - Complex bias calculation (lines 250-297)
  - Rounding modes: ROUND_DOWN, ROUND_UP, SNAP_TO_NEAREST
  - Formula: `normalizedHeight - (normalizedWidth / 2)`

### 5. Rendering System (MASSIVE COMPLEXITY)
- [ ] **IsometricTileRenderer.ts** - `ui/src/game/renderers/IsometricTileRenderer.ts`
  - **Change Detection**:
    - `hasSpriteTypeSettingsChanged()`, `hasWallPositioningSettingsChanged()`
    - Hash-based change tracking for positioning settings
  - **Tile Positioning**:
    - `applyTilePositioning()` - Complex sprite positioning logic (lines 606-658)
    - Uses spriteTypeSettings with vertical bias + invisible margins
    - `snap_position` logic ('above' vs 'below')
  - **Wall Positioning**:
    - `applyWallPositioning()` - Even more complex wall positioning (lines 748-1013)
    - Bounding box computations and caching
    - Sprite trimming support
    - Diagonal offsets (NE, NW directions)
    - Relative edge positioning
    - Manual horizontal/vertical offsets
  - **Fallback Calculations**: Auto-calculates positioning when settings missing
  - **Store Updates**: Deferred store updates during rendering to avoid cycles

### 6. UI Components (MASSIVE REMOVAL NEEDED)
- [ ] **IsometricConfigurationPanel.tsx** - `ui/src/components/battlemap/canvas/IsometricConfigurationPanel.tsx`
  - **2,300+ lines** of positioning controls UI
  - **50+ functions** for handling margin controls
  - **Extensive form controls**: Sliders, number inputs, toggles for all positioning settings
  - **Shared vs Per-Direction controls** for both blocks and walls
  - **Manual positioning UI**: All margin types, vertical bias, horizontal offsets, diagonal offsets
  - **Wall-specific UI**: Relative positioning, sprite trimming, A division controls
  - **Config management UI**: Load/save JSON configs, sync to store
- [ ] **SpriteConfigurationManager integration** - Used throughout the panel
- [ ] **Related UI components**:
  - `IsometricSpriteSelector.tsx` - References positioning settings
  - `CanvasControls.tsx` - Includes configuration panel

---

## Components to Keep

### 1. Core Infrastructure
- [x] **BattlemapEngine.ts** - Core PixiJS application and layer management
  - **Reason**: Layer system (tiles, grid, effects, entities, ui) will remain the same
- [x] **GameManager.ts** - Main initialization and component coordination
  - **Reason**: Core game loop and component management stays
- [x] **Core Types** - Basic isometric types and enums (IsometricDirection, etc.)
  - **Reason**: Direction system still needed for new analysis-based approach

### 2. Rendering Pipeline (PARTIAL KEEP)
- [x] **Layer rendering order** - tiles → grid → effects → entities → ui
  - **Reason**: Diamond-based system can use same rendering layers
- [x] **Sprite management** - Texture loading and caching
  - **Reason**: Still need sprite management, just different positioning
- [x] **Grid system** - Basic isometric coordinate transforms
  - **Reason**: Grid-to-isometric conversion still needed

---

## Components to Rewrite

### 1. Positioning Logic (COMPLETE REWRITE)
- [x] **Files to Rewrite**:
  - `IsometricTileRenderer.ts` - Replace all positioning logic
  - All store positioning actions and calculations
- [x] **Reason**: Current system uses 40+ manual parameters vs automated diamond analysis
- [x] **New Approach**:
  - Load diamond analysis data from JSON files
  - Use vertex-based positioning instead of margin calculations
  - Pre-computed positioning eliminates runtime complexity

### 2. Configuration Management (FUNDAMENTAL CHANGE)
- [x] **Files to Rewrite**:
  - `SpriteConfigurationManager.ts` - Replace with analysis data loader
  - `IsometricConfigurationPanel.tsx` - Completely new UI for diamond system
- [x] **Reason**: Manual positioning UI becomes obsolete with automated analysis
- [x] **New Approach**:
  - Asset analysis pipeline instead of manual configuration
  - Real-time positioning preview using diamond data
  - Gameplay-focused controls (walkability, collision) instead of visual tweaking

### 3. Store Architecture (MAJOR SIMPLIFICATION)
- [x] **Files to Rewrite**:
  - Remove all DirectionalSettings-based state management
  - Replace with diamond-based asset metadata
- [x] **Reason**: 40+ positioning parameters → single analysis file per asset
- [x] **New Approach**:
  - `AssetAnalysis` interface replaces DirectionalSettings
  - Diamond geometry + collision data + walkability
  - Z-portal navigation system

---

## Analysis Notes

### Search Summary: Complete Legacy System Scope
- **Core Positioning**: 15+ files with DirectionalSettings and margin management
- **Vertical Bias System**: Complex computation modes with 3 rounding algorithms
- **Rendering Complexity**: 1000+ lines of positioning logic in IsometricTileRenderer
- **UI Complexity**: 2300+ lines in configuration panel with 50+ positioning controls
- **Store Complexity**: Multiple duplicated interfaces and extensive action handlers
- **Configuration System**: JSON-based manual positioning configs + runtime calculations

### Key Discovery: System Scale
This is **not a simple refactor** - it's a **fundamental architecture change**:
- **From**: 40+ manual parameters per sprite × 4 directions × complex UI
- **To**: Single analysis file per asset with automated positioning

### Recommended Migration Strategy
1. **Phase 1**: Build new diamond-based positioning system alongside existing
2. **Phase 2**: Create new simplified UI for diamond system controls
3. **Phase 3**: Migrate assets to diamond analysis data
4. **Phase 4**: Remove entire legacy positioning system

### Critical Dependencies
- **Asset Analysis Pipeline**: Need automated analysis generation for new sprites
- **Editor Workflow**: New positioning preview system
- **Performance**: Pre-computed vs runtime positioning benefits
- **Gameplay Features**: Collision, walkability, z-portals from diamond data