
import { useState, useMemo } from 'react';

interface UseTableProps<T> {
  initialData: T[];
  initialSortKey?: keyof T;
}

export const useTable = <T extends object>({ initialData, initialSortKey }: UseTableProps<T>) => {
  const [sortKey, setSortKey] = useState<keyof T | undefined>(initialSortKey);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedData = useMemo(() => {
    if (!sortKey) return initialData;

    const sorted = [...initialData].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [initialData, sortKey, sortOrder]);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return {
    sortedData,
    sortKey,
    sortOrder,
    handleSort,
  };
};
