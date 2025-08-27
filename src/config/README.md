# Navigation Configuration

This directory contains centralized navigation configuration that eliminates duplication across the application.

## Files

- **`navigation.ts`** - Single source of truth for navigation items, order, styling, and behavior
- **`../hooks/useNavigation.ts`** - Navigation utilities hook for React components

## Architecture

### Before Refactor ❌
- Navigation defined in **two places**: `App.tsx` and `NavigationHeader.tsx`  
- Code duplication for buttons and dashboard cards
- Manual updates required in multiple files for navigation changes
- Risk of inconsistency between components

### After Refactor ✅
- **Single source of truth**: `navigation.ts` config file
- Automatic generation of navigation buttons and dashboard cards
- Centralized styling and behavior logic
- Easy to add/remove/reorder navigation items

## Usage

### Navigation Items Array
```typescript
export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'apstra-connection',
    label: '1. Apstra Connection', 
    shortLabel: 'Connection',
    color: '#28a745',
    description: 'Set up connection to your Apstra controller and blueprint'
  },
  // ... more items
];
```

### Components Using Navigation
- **`App.tsx`**: Header buttons and dashboard cards  
- **`NavigationHeader.tsx`**: Sub-page navigation
- **`useNavigation.ts`**: Hook for navigation utilities

### Adding New Navigation Items
1. Add new item to `NAVIGATION_ITEMS` array in `navigation.ts`
2. Add corresponding state and handler in `App.tsx` switch statements
3. Navigation automatically appears in both header and dashboard

### Styling Functions
- `getNavigationStyles()` - Button styling with authentication state
- `getDashboardCardStyles()` - Dashboard card styling
- `getHoverStyles()` - Hover effect configurations

## Benefits

✅ **Single Source of Truth**: One place to define navigation order and properties
✅ **No Code Duplication**: Shared logic between header and dashboard
✅ **Easy Maintenance**: Add/modify navigation in one location
✅ **Type Safety**: TypeScript interfaces prevent navigation errors
✅ **Consistent Styling**: Centralized color schemes and hover effects