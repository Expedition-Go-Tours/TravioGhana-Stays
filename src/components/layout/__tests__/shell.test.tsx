import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

const teamRoleState = {
  isOwner: true,
  teamRoles: ['admin'],
  permissions: ['*'],
  storefronts: [],
  hasPermission: () => true,
};
vi.mock('@/hooks/useTeamRole', () => ({ useTeamRole: () => teamRoleState }));
vi.mock('@/features/auth/api', () => ({ loadSupplierProfile: vi.fn(async () => null) }));
vi.mock('@/lib/axios', () => ({ default: { get: vi.fn(async () => ({ data: { data: {} } })), post: vi.fn() } }));
vi.mock('@/features/stays/components/notifications/StaysNotificationBell', () => ({ default: () => null }));

import Sidebar from '../Sidebar';
import Header from '../Header';
import SearchDropdown from '../SearchDropdown';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useAuthStore } from '@/stores/authStore';

function Location() {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
}

/** A button that navigates without the drawer's own links, to prove route changes close it. */
function GoElsewhere() {
  const navigate = useNavigate();
  return (
    <button type="button" onClick={() => navigate('/stays/finance')}>
      programmatic navigate
    </button>
  );
}

function renderShell(initial = '/stays') {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Header />
      <Sidebar />
      <GoElsewhere />
      <Routes>
        <Route path="*" element={<Location />} />
      </Routes>
    </MemoryRouter>,
  );
}

const logout = vi.fn(async () => {});

beforeEach(() => {
  localStorage.clear();
  logout.mockClear();
  act(() => useSidebarStore.setState({ isCollapsed: false, isMobileOpen: false }));
  useAuthStore.setState({
    user: { id: 'u1', name: 'Ama Boateng', email: 'ama@example.com', roles: ['supplier'] },
    token: 't',
    isAuthenticated: true,
    supplierProfile: { status: 'ACTIVE', businessName: 'Akwaaba Coast Hotel' },
    logout,
  } as never);
});

describe('phone navigation drawer', () => {
  it('opens from a labelled menu button whose state is announced', async () => {
    const user = userEvent.setup();
    renderShell();
    const menu = screen.getByRole('button', { name: 'Open menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveAttribute('aria-controls', 'mobile-nav');

    await user.click(menu);
    const drawer = screen.getByRole('dialog', { name: 'Menu' });
    expect(drawer).toHaveAttribute('id', 'mobile-nav');
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    // Full labels in the drawer, always.
    expect(within(drawer).getByRole('link', { name: 'Bookings' })).toBeTruthy();
    expect(drawer.contains(document.activeElement)).toBe(true);
  });

  it('closes on Escape and returns focus to the menu button', async () => {
    const user = userEvent.setup();
    renderShell();
    const menu = screen.getByRole('button', { name: 'Open menu' });
    await user.click(menu);
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull());
    expect(useSidebarStore.getState().isMobileOpen).toBe(false);
    expect(menu).toHaveFocus();
  });

  it('closes when a link is chosen, and lands on that page', async () => {
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('link', { name: 'Bookings' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull());
    expect(screen.getByTestId('location')).toHaveTextContent('/stays/bookings');
  });

  it('closes on any route change, not only its own links', async () => {
    renderShell();
    act(() => useSidebarStore.getState().openMobile());
    expect(screen.getByRole('dialog', { name: 'Menu' })).toBeTruthy();
    // The drawer is modal, so drive the navigation from outside the test DOM's focus trap.
    act(() => screen.getByRole('button', { name: 'programmatic navigate', hidden: true }).click());
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Menu' })).toBeNull());
    expect(screen.getByTestId('location')).toHaveTextContent('/stays/finance');
  });
});

describe('desktop sidebar', () => {
  it('collapses to the rail and remembers it across reloads', async () => {
    const user = userEvent.setup();
    renderShell();
    const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('complementary', { name: 'Workspace' })).toHaveAttribute('data-rail', 'true');
    expect(JSON.parse(localStorage.getItem('stays-sidebar') || '{}').state).toEqual({ isCollapsed: true });
  });

  it('keeps every link named in the rail (labels become screen-reader text)', () => {
    act(() => useSidebarStore.setState({ isCollapsed: true }));
    renderShell();
    const nav = within(screen.getByRole('complementary', { name: 'Workspace' })).getByRole('navigation', {
      name: 'Main navigation',
    });
    expect(within(nav).getByRole('link', { name: 'Finance' })).toBeTruthy();
    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });

  it('signs out from the collapsed rail, after confirming', async () => {
    const user = userEvent.setup();
    act(() => useSidebarStore.setState({ isCollapsed: true }));
    renderShell();
    const aside = screen.getByRole('complementary', { name: 'Workspace' });
    await user.click(within(aside).getByRole('button', { name: 'Sign out' }));

    const confirm = screen.getByRole('alertdialog', { name: 'Sign out of the dashboard?' });
    expect(within(confirm).getByRole('button', { name: 'Stay signed in' })).toHaveFocus();
    expect(logout).not.toHaveBeenCalled();

    await user.click(within(confirm).getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'));
  });

  it('the business card is a link to settings', () => {
    renderShell();
    const aside = screen.getByRole('complementary', { name: 'Workspace' });
    expect(within(aside).getByRole('link', { name: /Akwaaba Coast Hotel/ })).toHaveAttribute('href', '/stays/settings?tab=profile');
  });
});

describe('header', () => {
  it('links the logo home and offers a skip-free 44px menu button', () => {
    renderShell('/stays/bookings');
    expect(screen.getByRole('link', { name: /Stays dashboard home/ })).toHaveAttribute('href', '/stays');
    expect(screen.getByRole('button', { name: 'Open menu' })).toHaveClass('h-11', 'w-11');
  });
});

describe('command palette', () => {
  function renderPalette() {
    return render(
      <MemoryRouter initialEntries={['/stays']}>
        <SearchDropdown />
        <Routes>
          <Route path="*" element={<Location />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('opens with Ctrl+K and moves the active option with the arrow keys', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.keyboard('{Control>}k{/Control}');

    const input = screen.getByRole('combobox', { name: 'Search pages' });
    expect(input).toHaveFocus();
    await user.type(input, 'pay');

    const listbox = screen.getByRole('listbox', { name: 'Matching pages' });
    const options = within(listbox).getAllByRole('option');
    expect(options.length).toBeGreaterThan(1);
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[1].id);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');

    await user.keyboard('{ArrowUp}{ArrowUp}');
    expect(input).toHaveAttribute('aria-activedescendant', options[options.length - 1].id);
  });

  it('opens the chosen page with Enter, closes, and remembers it as recent', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(screen.getAllByRole('button', { name: 'Search pages' })[0]);
    await user.type(screen.getByRole('combobox'), 'calendar');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByTestId('location')).toHaveTextContent('/stays/availability');

    await user.click(screen.getAllByRole('button', { name: 'Search pages' })[0]);
    expect(within(screen.getByRole('listbox', { name: 'Recent pages' })).getByRole('option', { name: /Availability/ })).toBeTruthy();
  });

  it('says so when nothing matches', async () => {
    const user = userEvent.setup();
    renderPalette();
    await user.click(screen.getAllByRole('button', { name: 'Search pages' })[0]);
    await user.type(screen.getByRole('combobox'), 'zzzz');
    expect(screen.getByRole('status')).toHaveTextContent('No pages match');
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-activedescendant');
  });

  it('never offers a page the role cannot open', async () => {
    const user = userEvent.setup();
    teamRoleState.hasPermission = (permission: string) => permission !== 'payouts.view';
    renderPalette();
    await user.click(screen.getAllByRole('button', { name: 'Search pages' })[0]);
    await user.type(screen.getByRole('combobox'), 'finance');
    expect(screen.queryByRole('option', { name: /^Finance/ })).toBeNull();
    teamRoleState.hasPermission = () => true;
  });
});
