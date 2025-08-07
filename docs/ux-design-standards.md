# User Experience Design Standards (Updated 2024-01-15)

## Authentication Flow UX Requirements

### Visual State System
The application implements a **discomfort-to-comfort UX progression** designed to guide users through proper authentication workflow:

**CRITICAL REQUIREMENTS** (Must be maintained in code):

### 12.1 Default Password Configuration
- **Default password MUST be 'admin'** in all configuration contexts:
  - Form initialization: `password: 'admin'`
  - Default configuration file: `data/default_apstra_config.json` password field
  - User configuration loading: fallback to 'admin' when empty
- **Rationale**: Common default for Apstra systems, reduces setup friction

### 12.2 Uncomfortable Authentication State (Not Connected)
- **Visual Design**: Red background with pulsing animation
- **CSS Implementation**:
  ```css
  .connect-button {
    background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
    border: 2px solid #dc3545;
    animation: uncomfortable-pulse 2s infinite;
  }
  
  @keyframes uncomfortable-pulse {
    0%, 100% { 
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
      transform: scale(1);
    }
    50% { 
      box-shadow: 0 6px 20px rgba(220, 53, 69, 0.6);
      transform: scale(1.02);
    }
  }
  ```
- **Button Text**: "Connect to Apstra" (urgent language)
- **Psychological Effect**: Creates visual urgency to complete authentication

### 12.3 Comfortable Authentication State (Connected)
- **Visual Design**: Green background with subtle shimmer effect
- **CSS Implementation**:
  ```css
  .connect-button.connected {
    background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
    border-color: #28a745;
    animation: none !important; /* Remove uncomfortable pulse */
  }
  
  .connect-button.connected::before {
    content: '';
    position: absolute;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    animation: shimmer 2s infinite;
  }
  ```
- **Button Text**: "✅ Connected" (success confirmation)
- **Psychological Effect**: Visual reward for completing authentication

### 12.4 UX Flow Implementation Requirements

**State Transition Logic**:
1. **Initial Load**: Button appears in uncomfortable (red/pulsing) state
2. **Authentication Success**: Immediate transition to comfortable (green/shimmer) state
3. **Configuration Change**: Return to uncomfortable state, invalidate session
4. **Session Expiration**: Automatic return to uncomfortable state

**Tools Page Integration**:
- **Disabled Sections**: When not authenticated, show disabled/grayed out sections
- **Warning Banners**: Prominent banner directing users to authentication
- **Navigation Integration**: One-click navigation to Apstra Connection page

### 12.5 Documentation Requirements
These UX standards MUST be documented in:
- **SPECIFICATION.md**: Formal specification with CSS examples
- **Component Documentation**: Inline comments explaining UX rationale
- **Test Scenarios**: Automated tests validating state transitions

### 12.6 Code Maintenance Standards
- **CSS Class Naming**: `.connect-button` and `.connect-button.connected` classes required
- **Animation Standards**: All animations must be cancellable with `animation: none !important`
- **State Management**: Authentication state must drive visual state directly
- **No Override Exceptions**: UX state must never be overridden by local component state

**CRITICAL**: Any changes to authentication components must preserve these UX patterns to maintain user guidance effectiveness.

## User Interface Streamlining

### 13.1 Sheet Selection Interface Optimization

**Objective**: Reduce visual clutter and improve user workflow efficiency in the provisioning page sheet selection section.

**Changes Implemented**:

- Removed redundant "Select Sheet" title from SheetSelector component
- Eliminated "File: [filename]" display text
- Removed "Available sheets (X):" label text
- Maintained sheet button functionality and selected state indication

**Rationale**:

- Sheet selection is already clearly indicated by the step header "Step 2: Select Sheet"
- File name information is displayed in Step 1 after upload
- Sheet count is visually apparent from the number of buttons displayed
- Streamlined interface reduces cognitive load and improves focus on sheet selection action

**Impact**:

- Cleaner, more focused user interface
- Reduced redundant information display
- Maintains all functional capabilities
- Improved visual hierarchy and information organization