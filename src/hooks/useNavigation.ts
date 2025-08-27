// Navigation Hook - Centralized navigation utilities
import { NAVIGATION_ITEMS, getNavigationItem, NavigationItem } from '../config/navigation';

export type NavigationPage = 'home' | 'apstra-connection' | 'provisioning' | 'tools' | 'conversion-map';

export const useNavigation = () => {
  const getNavigationItems = (): NavigationItem[] => {
    return NAVIGATION_ITEMS;
  };

  const getNavigationItemById = (id: string): NavigationItem | undefined => {
    return getNavigationItem(id);
  };

  const getNavigationOrder = (): string[] => {
    return NAVIGATION_ITEMS.map(item => item.id);
  };

  const isValidNavigationPage = (page: string): page is NavigationPage => {
    return NAVIGATION_ITEMS.some(item => item.id === page) || page === 'home';
  };

  return {
    navigationItems: NAVIGATION_ITEMS,
    getNavigationItems,
    getNavigationItemById,
    getNavigationOrder,
    isValidNavigationPage
  };
};

export default useNavigation;