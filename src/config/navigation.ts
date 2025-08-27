// Navigation Configuration - Single Source of Truth
export interface NavigationItem {
  id: 'home' | 'apstra-connection' | 'provisioning' | 'tools' | 'conversion-map';
  label: string;
  shortLabel: string;
  color: string;
  description: string;
  icon?: string;
  isAuthenticated?: boolean;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'apstra-connection',
    label: '1. Apstra Connection',
    shortLabel: 'Connection',
    color: '#28a745',
    description: 'Set up connection to your Apstra controller and blueprint',
    icon: '🔌'
  },
  {
    id: 'provisioning',
    label: '2. Provisioning',
    shortLabel: 'Provision',
    color: '#dc3545',
    description: 'Upload Excel files, map data, and provision network configurations',
    icon: '⚡'
  },
  {
    id: 'tools',
    label: '3. Tools',
    shortLabel: 'Tools',
    color: '#6f42c1',
    description: 'Search systems, IP addresses, and manage blueprints',
    icon: '🛠️'
  },
  {
    id: 'conversion-map',
    label: '4. Conversion Map',
    shortLabel: 'Mapping',
    color: '#007bff',
    description: 'Customize Excel header mapping for accurate data processing',
    icon: '🗺️'
  }
];

// Navigation utility functions
export const getNavigationItem = (id: string): NavigationItem | undefined => {
  return NAVIGATION_ITEMS.find(item => item.id === id);
};

export const getNavigationOrder = (): string[] => {
  return NAVIGATION_ITEMS.map(item => item.id);
};

export const getNavigationStyles = (id: string, isActive: boolean = false, isAuthenticated: boolean = false): React.CSSProperties => {
  const item = getNavigationItem(id);
  if (!item) return {};
  
  const baseStyles: React.CSSProperties = {
    padding: '10px 20px',
    backgroundColor: item.color,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: ['provisioning', 'tools'].includes(id) ? '600' : 'normal',
    transition: 'all 0.3s ease'
  };

  // Special styling for Apstra Connection based on auth status
  if (id === 'apstra-connection') {
    baseStyles.backgroundColor = isAuthenticated ? '#28a745' : '#dc3545';
    if (!isAuthenticated) {
      baseStyles.animation = 'uncomfortable-pulse 2s infinite';
    }
  }

  // Active state styling
  if (isActive) {
    baseStyles.opacity = 0.8;
    baseStyles.transform = 'scale(0.98)';
  }

  return baseStyles;
};

export const getDashboardCardStyles = (id: string, isAuthenticated: boolean = false): React.CSSProperties => {
  const item = getNavigationItem(id);
  if (!item) return {};

  const baseStyles: React.CSSProperties = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    border: `2px solid ${item.color}`,
    minWidth: '200px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };

  // Special styling for Apstra Connection
  if (id === 'apstra-connection') {
    baseStyles.borderColor = isAuthenticated ? '#28a745' : '#dc3545';
    if (!isAuthenticated) {
      baseStyles.animation = 'uncomfortable-pulse 2s infinite';
    }
  }

  return baseStyles;
};

export const getHoverStyles = (id: string, isAuthenticated: boolean = false): { 
  backgroundColor: string, 
  transform: string, 
  boxShadow: string 
} => {
  const item = getNavigationItem(id);
  if (!item) return { backgroundColor: 'white', transform: 'translateY(0)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' };

  let bgColor = '#f8fbff'; // default blue tint
  
  switch (id) {
    case 'apstra-connection':
      bgColor = isAuthenticated ? '#f8fff9' : '#fff8f8'; // green or red tint
      break;
    case 'provisioning':
      bgColor = '#fffbfb'; // red tint
      break;
    case 'tools':
      bgColor = '#fdfbff'; // purple tint
      break;
    case 'conversion-map':
      bgColor = '#f8fbff'; // blue tint
      break;
  }

  return {
    backgroundColor: bgColor,
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)'
  };
};