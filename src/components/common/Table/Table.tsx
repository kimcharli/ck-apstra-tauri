
import React from 'react';
import styles from './Table.module.css';

interface TableProps<T> {
  data: T[];
  columns: {
    key: keyof T;
    header: string;
    render?: (item: T) => React.ReactNode;
  }[];
  onSort?: (sortKey: keyof T) => void;
  sortKey?: keyof T;
  sortOrder?: 'asc' | 'desc';
}

export const Table = <T extends object>({
  data,
  columns,
  onSort,
  sortKey,
  sortOrder,
}: TableProps<T>) => {
  const renderHeader = () => {
    return (
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={col.key as string}
              onClick={() => onSort && onSort(col.key)}
              className={styles.th}
            >
              {col.header}
              {sortKey === col.key && (
                <span>{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
    );
  };

  const renderBody = () => {
    return (
      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            {columns.map((col) => (
              <td key={col.key as string} className={styles.td}>
                {col.render ? col.render(row) : (row[col.key] as React.ReactNode)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    );
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        {renderHeader()}
        {renderBody()}
      </table>
    </div>
  );
};
