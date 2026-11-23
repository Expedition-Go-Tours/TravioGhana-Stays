import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, ErrorState, Pagination, type DataColumn } from '..';

type Row = { id: string; guest: string; nights: number; amount: number };

const ROWS: Row[] = [
  { id: 'b1', guest: 'Sarah Johnson', nights: 4, amount: 3000 },
  { id: 'b2', guest: 'Kwame Agyeman', nights: 2, amount: 1700 },
  { id: 'b3', guest: 'Rebecca Smith', nights: 3, amount: 2250 },
];

const COLUMNS: DataColumn<Row>[] = [
  { key: 'guest', header: 'Guest', sortable: true },
  { key: 'nights', header: 'Nights', align: 'right', sortable: true },
  { key: 'amount', header: 'Total', align: 'right', cell: (row) => `$${row.amount}`, sortable: true },
  { key: 'internal', header: 'Internal ref', hideOnMobile: true, cell: (row) => `ref-${row.id}` },
];

/** A controllable viewport width for matchMedia('(min-width: …)'). */
function setViewport(width: number) {
  const listeners = new Set<() => void>();
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0);
    return {
      matches: width >= min,
      media: query,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    };
  }) as unknown as typeof window.matchMedia;
  return {
    resize(next: number) {
      width = next;
      act(() => listeners.forEach((fn) => fn()));
    },
  };
}

const originalMatchMedia = window.matchMedia;
afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('DataTable layout', () => {
  it('is a real table from md up', () => {
    setViewport(1024);
    render(<DataTable ariaLabel="Recent reservations" columns={COLUMNS} rows={ROWS} />);
    const table = screen.getByRole('table', { name: 'Recent reservations' });
    expect(within(table).getAllByRole('columnheader')).toHaveLength(4);
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByText('ref-b1')).toBeTruthy();
  });

  it('becomes cards below md, hiding phone-hidden columns, and switches live on resize', () => {
    const viewport = setViewport(375);
    render(<DataTable ariaLabel="Recent reservations" columns={COLUMNS} rows={ROWS} />);
    expect(screen.queryByRole('table')).toBeNull();
    const list = screen.getByRole('list', { name: 'Recent reservations' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getAllByText('Nights')).toHaveLength(3);
    expect(screen.queryByText('ref-b1')).toBeNull();

    viewport.resize(1280);
    expect(screen.getByRole('table', { name: 'Recent reservations' })).toBeTruthy();
  });

  it('can force a layout', () => {
    setViewport(375);
    render(<DataTable ariaLabel="Totals" columns={COLUMNS} rows={ROWS} layout="table" />);
    expect(screen.getByRole('table')).toBeTruthy();
  });
});

describe('DataTable behaviour', () => {
  it('sorts by a column and exposes aria-sort', async () => {
    setViewport(1024);
    const user = userEvent.setup();
    render(<DataTable ariaLabel="Bookings" columns={COLUMNS} rows={ROWS} />);
    const guests = () => screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent);

    await user.click(screen.getByRole('button', { name: /Total/ }));
    expect(screen.getByRole('columnheader', { name: /Total/ })).toHaveAttribute('aria-sort', 'ascending');
    expect(guests()).toEqual(['Kwame Agyeman', 'Rebecca Smith', 'Sarah Johnson']);

    await user.click(screen.getByRole('button', { name: /Total/ }));
    expect(screen.getByRole('columnheader', { name: /Total/ })).toHaveAttribute('aria-sort', 'descending');
    expect(guests()).toEqual(['Sarah Johnson', 'Rebecca Smith', 'Kwame Agyeman']);
  });

  it('clickable rows work with mouse and keyboard, in both layouts', async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    setViewport(1024);
    const { unmount } = render(
      <DataTable ariaLabel="Bookings" columns={COLUMNS} rows={ROWS} onRowClick={onRowClick} rowLabel={(r) => `Open ${r.guest}`} />,
    );
    await user.click(screen.getByText('Kwame Agyeman'));
    expect(onRowClick).toHaveBeenLastCalledWith(ROWS[1]);
    screen.getByRole('row', { name: 'Open Rebecca Smith' }).focus();
    await user.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenLastCalledWith(ROWS[2]);
    unmount();

    setViewport(375);
    render(<DataTable ariaLabel="Bookings" columns={COLUMNS} rows={ROWS} onRowClick={onRowClick} rowLabel={(r) => `Open ${r.guest}`} />);
    screen.getByRole('listitem', { name: 'Open Sarah Johnson' }).focus();
    await user.keyboard(' ');
    expect(onRowClick).toHaveBeenLastCalledWith(ROWS[0]);
  });

  it('shows loading, empty, error and unavailable states', async () => {
    setViewport(1024);
    const onRetry = vi.fn();
    const { rerender } = render(<DataTable ariaLabel="Bookings" columns={COLUMNS} rows={undefined} status="loading" />);
    expect(screen.getByRole('status', { name: 'Loading Bookings' })).toBeTruthy();

    rerender(<DataTable ariaLabel="Bookings" columns={COLUMNS} rows={[]} empty={<p>No bookings yet</p>} />);
    expect(screen.getByText('No bookings yet')).toBeTruthy();

    rerender(<DataTable ariaLabel="Bookings" columns={COLUMNS} rows={[]} status="error" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<DataTable ariaLabel="Bookings" columns={COLUMNS} rows={[]} status="unavailable" unavailableFeature="Bookings" />);
    expect(screen.getByRole('status')).toHaveTextContent("isn't available on your account yet");
  });
});

describe('ErrorState', () => {
  it('shows a retry spinner while retrying', () => {
    render(<ErrorState onRetry={() => {}} retrying />);
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Pagination', () => {
  it('moves between pages and disables the ends', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = render(<Pagination page={1} totalPages={3} totalCount={52} onPageChange={onPageChange} itemLabel="bookings" />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toHaveTextContent('Page 1 of 3');
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(<Pagination page={3} totalPages={3} onPageChange={onPageChange} />);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('renders nothing for one page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
