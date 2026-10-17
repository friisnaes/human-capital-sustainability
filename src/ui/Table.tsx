/** Sorterbar tabel med tastaturbetjening af rækker. */
import { type KeyboardEvent, type ReactNode, useMemo, useState } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  /** Værdi til sortering. Udelades = kolonnen kan ikke sorteres. */
  sortValue?: (row: T) => number | string | null;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowLabel,
  caption,
  initialSort,
  empty,
  dense = false,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowLabel?: (row: T) => string;
  caption: string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  empty?: ReactNode;
  dense?: boolean;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const sv = col.sortValue;
    return [...rows].sort((a, b) => {
      const x = sv(a);
      const y = sv(b);
      if (x === y) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'da');
      return sort.dir === 'asc' ? c : -c;
    });
  }, [rows, sort, columns]);

  const toggle = (key: string) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  };

  const onKey = (e: KeyboardEvent, row: T) => {
    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onRowClick(row);
    }
  };

  const alignCls = (a?: string) => (a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left');
  const pad = dense ? '!py-1.5' : '';

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  className={`th ${alignCls(c.align)} ${c.headerClassName ?? ''}`}
                  aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {c.sortValue ? (
                    <button type="button" onClick={() => toggle(c.key)} className={`inline-flex items-center gap-1 uppercase tracking-[0.08em] hover:text-ink ${active ? 'text-ink' : ''}`}>
                      {c.header}
                      <span aria-hidden="true" className="text-[10px]">{active ? (sort!.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
                      <span className="sr-only">{active ? (sort!.dir === 'asc' ? ', sorteret stigende' : ', sorteret faldende') : ', klik for at sortere'}</span>
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="td py-8 text-center text-ink-muted">
                {empty ?? 'Ingen rækker at vise.'}
              </td>
            </tr>
          )}
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? 'rowlink focus-visible:bg-sunk' : ''}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (e) => onKey(e, row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick && rowLabel ? `${rowLabel(row)} – åbn detaljer` : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={`td ${pad} ${alignCls(c.align)} ${c.className ?? ''}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
