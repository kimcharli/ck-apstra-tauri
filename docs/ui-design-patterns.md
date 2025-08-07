# UI/UX Design Patterns

## Button-Style Web Opening Pattern
**Standard Pattern for External Web Links**: All interactive elements that open external Apstra web pages use a consistent button-style approach.

**Implementation Requirements**:
- **Import**: `import { open } from '@tauri-apps/api/shell';`
- **Click Handler**: `onClick={() => open(url)}` (never use `window.open()`)
- **CSS Classes**: 
  - `.blueprint-btn` for blueprint-related actions (blue gradient)
  - `.system-btn` for system-related actions (green gradient)
- **Tooltip**: Always include `title` attribute with descriptive text

**Usage Locations**:
- System search results: Blueprint column and System column buttons
- Blueprints table: Blueprint label as clickable button
- Any future Apstra web navigation requirements

**Rationale**: 
- `window.open()` doesn't work in Tauri desktop environment
- Tauri's `shell.open()` properly opens URLs in user's default browser
- Consistent button styling provides clear visual cue for web navigation
- Tooltips improve accessibility and user understanding

**Example Implementation**:
```typescript
<button
  className="blueprint-btn"
  onClick={() => open(`https://${apstraHost}/#/blueprints/${blueprintId}/staged`)}
  title={`Open blueprint ${blueprintLabel} in Apstra`}
>
  {blueprintLabel}
</button>
```

## Graph Query Pattern for Topology Information
**Standard Pattern for System Topology Extraction**: System searches use graph queries to retrieve hierarchical topology information (pod, rack) in a single API call.

**Implementation Requirements**:
- **Method**: `searchSystemsWithTopology(blueprintId, serverName)` instead of basic `searchSystems()`
- **Graph Query**: 
```
match(
  node('system', label='{system_label}', name='system')
    .out().node('pod', name='pod'),
  node(name='system')
    .out().node('rack', name='rack')
)
```

**Response Processing**:
- Graph query returns named nodes: `item.system`, `item.pod`, `item.rack`
- Extract properties: `item.system.id`, `item.pod.label`, `item.rack.label`
- Fallback to direct properties for backward compatibility

**Usage Locations**:
- System search results with pod/rack columns
- IP search results with interface/system/pod/rack columns
- Any system topology queries requiring hierarchical context

**Rationale**:
- Single query retrieves system, pod, and rack information efficiently
- Reduces API calls compared to separate topology queries  
- Provides accurate hierarchical context for network elements
- Enables proper system identification in multi-pod environments

## IP Search Pattern with Interface Topology
**Enhanced Pattern for IP Address Discovery**: IP searches use specialized graph queries to traverse from interfaces to systems and topology, providing complete network context.

**Implementation Requirements**:
- **Method**: `searchIPsWithTopology(blueprintId, ipAddress)` for comprehensive IP discovery
- **Graph Query**:
```
match(
  node('interface', ipv4_addr='{ip_slash_mask}', name='intf').in_().node('system', name='system')
    .out().node('pod', name='pod'),
  node(name='system').out().node('rack', name='rack')
)
```

**Response Processing**:
- Graph query returns named nodes: `item.intf`, `item.system`, `item.pod`, `item.rack`
- Extract interface properties: `item.intf.id`, `item.intf.ipv4_addr`, `item.intf.if_name`, `item.intf.if_type`
- Extract system properties: `item.system.id`, `item.system.hostname`
- Extract topology: `item.pod.label`, `item.rack.label` with respective IDs
- Format interface labels: `if_name (if_type)` or `if_type` if if_name is empty

**Search Features**:
- **Blueprint Selection**: Default "Select Blueprint", use selected or search all
- **Cross-Blueprint Search**: Automatically searches all blueprints when no specific blueprint selected
- **Table Results**: Blueprint, Pod, Rack, System, Interface, IP Address, and Details columns
- **Button Navigation**: All network entities clickable with proper Apstra URLs

**Usage Locations**:
- IP search results with complete network topology context
- Interface-centric queries requiring system and topology information
- Network troubleshooting workflows requiring IP-to-system mapping

**Rationale**:
- **Interface-First Discovery**: Starts from IP interfaces and traverses to system context
- **Complete Network Context**: Single query provides interface, system, and topology information
- **Efficient Troubleshooting**: Reduces multiple queries for IP address investigation
- **Consistent UX**: Follows same pattern as system search for user familiarity

## Blueprint Management Operations
**Automated Blueprint Data Export**: Blueprint dump functionality provides complete blueprint configuration export with automated file download.

**Implementation Requirements**:
- **Method**: `dumpBlueprint(blueprintId)` for complete blueprint data retrieval
- **API Endpoint**: `/api/blueprints/{blueprintId}` for full blueprint JSON export (backend implementation needed)
- **File Download**: Client-side JSON file generation with automated download
- **Current Status**: Demo implementation using graph queries while backend is being developed

**Dump Features**:
- **Filename Generation**: `{blueprint-name}-{YYYYMMDDTHHMMSS}.json` format
- **Name Sanitization**: Blueprint names sanitized for filesystem compatibility
- **Pretty JSON**: Downloaded files formatted with 2-space indentation for readability
- **Loading States**: Visual feedback during API call and file generation
- **Error Handling**: Authentication checks and comprehensive error reporting

**File Naming Pattern**:
```
dh50-colo1-20240115T143025.json
dh2-colo2-20240115T143127.json
```

**Usage Locations**:
- Blueprints management table: "Dump" action buttons
- Blueprint administration workflows
- Configuration backup and export operations

**Rationale**:
- **Complete Export**: Full blueprint configuration for backup and analysis
- **Automated Workflow**: Single-click export with no manual file handling
- **Consistent Naming**: Timestamped files prevent naming conflicts
- **Immediate Download**: Browser-based download eliminates server storage needs

## Reusable ApstraButton Component Pattern
**Standard Pattern for Apstra Web Navigation**: All Apstra web links use a centralized, reusable button component with consistent styling and functionality.

**Component Location**: `/src/components/ApstraButton/ApstraButton.tsx`

**Implementation Requirements**:
- **Import**: `import ApstraButton from '../ApstraButton';`
- **Usage**: `<ApstraButton type="blueprint" label="DH50-Colo1" url={blueprintUrl} />`
- **Types**: `'blueprint' | 'system' | 'pod' | 'rack'` with distinct color schemes
- **URL Generation**: Use `generateApstraUrls` utility for consistent URL patterns

**Component Features**:
- **Type-based Styling**: Different gradient colors per component type
  - Blueprint: Blue gradient (`#007bff` → `#0056b3`)
  - System: Green gradient (`#28a745` → `#1e7e34`) 
  - Pod: Orange gradient (`#fd7e14` → `#dc6502`)
  - Rack: Purple gradient (`#6f42c1` → `#5a32a3`)
- **Auto-tooltips**: Generates descriptive tooltips automatically
- **Empty State Handling**: Shows "-" for missing/empty labels
- **Responsive Design**: Adapts sizing for mobile devices
- **Consistent Behavior**: Uses Tauri's `shell.open()` for all navigation

**URL Utility Functions** (`/src/utils/apstraUrls.ts`):
```typescript
generateApstraUrls.blueprint({ host, blueprintId })
generateApstraUrls.system({ host, blueprintId, nodeId })
generateApstraUrls.pod({ host, blueprintId, nodeId })
generateApstraUrls.rack({ host, blueprintId, nodeId })
```

**Usage Locations**:
- System search results: All four column types (Blueprint, Pod, Rack, System)
- Blueprints table: Blueprint labels as navigation buttons
- Any future Apstra entity navigation requirements

**Rationale**:
- **DRY Principle**: Single component eliminates code duplication
- **Consistent UX**: Uniform styling and behavior across all Apstra links
- **Maintainability**: Centralized styling and URL generation logic
- **Type Safety**: TypeScript ensures correct usage patterns
- **Scalability**: Easy to extend with new entity types