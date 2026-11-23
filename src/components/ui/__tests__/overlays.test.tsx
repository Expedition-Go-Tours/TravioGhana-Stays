import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogTrigger,
  Sheet,
  SheetContent,
  SheetTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '..';
import { useTabParam } from '@/hooks/useTabParam';
import StaysSeg from '@/features/stays/components/StaysSeg';
import DeleteModal from '../DeleteModal';

describe('Dialog', () => {
  function Example() {
    return (
      <>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Edit rate plan</Button>
          </DialogTrigger>
          <DialogContent title="Edit rate plan" description="Changes apply to new bookings" footer={<Button>Save</Button>}>
            <input aria-label="Plan name" />
          </DialogContent>
        </Dialog>
        <button type="button">Outside</button>
      </>
    );
  }

  it('opens as a labelled modal, traps focus and returns it on Escape', async () => {
    const user = userEvent.setup();
    render(<Example />);
    const trigger = screen.getByRole('button', { name: 'Edit rate plan' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Edit rate plan' });
    expect(dialog).toHaveAccessibleDescription('Changes apply to new bookings');
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Tabbing cycles inside the dialog; it never reaches the page behind.
    for (let i = 0; i < 5; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it('has a 44px close button', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole('button', { name: 'Edit rate plan' }));
    const close = screen.getByRole('button', { name: 'Close' });
    expect(close).toHaveClass('h-11', 'w-11');
    await user.click(close);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});

describe('ConfirmDialog', () => {
  function Example({ onConfirm }: { onConfirm: () => void }) {
    const [open, setOpen] = useState(true);
    return (
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Cancel this booking?"
        description="The guest is refunded in full."
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        onConfirm={onConfirm}
      />
    );
  }

  it('is an alert dialog with focus on the safe choice', () => {
    render(<Example onConfirm={() => {}} />);
    expect(screen.getByRole('alertdialog', { name: 'Cancel this booking?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keep booking' })).toHaveFocus();
  });

  it('still starts on Cancel when the body has focusable content', () => {
    render(
      <ConfirmDialog open onOpenChange={() => {}} title="Decline refund?" onConfirm={() => {}} cancelLabel="Go back">
        <button type="button">Read the refund policy</button>
      </ConfirmDialog>,
    );
    expect(screen.getByRole('button', { name: 'Go back' })).toHaveFocus();
  });

  it('confirms only on the explicit action', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);
    await user.keyboard('{Enter}'); // Enter on the focused Cancel just closes it
    expect(onConfirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  });

  it('runs onConfirm from the confirm button', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Example onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cannot be dismissed while the action is running', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Delete?" loading onConfirm={() => {}} />);
    await user.keyboard('{Escape}');
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveAttribute('aria-busy', 'true');
  });

  it('DeleteModal keeps its API on top of ConfirmDialog', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<DeleteModal isOpen onClose={onClose} onConfirm={onConfirm} title="Delete property" entityName="Akwaaba Coast Hotel" />);
    const dialog = screen.getByRole('alertdialog', { name: 'Delete property' });
    expect(dialog).toHaveTextContent('Akwaaba Coast Hotel');
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('Sheet', () => {
  it('opens as a dialog, closes on Escape and returns focus', async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger asChild>
          <Button>Filters</Button>
        </SheetTrigger>
        <SheetContent title="Filter bookings" footer={<Button>Apply</Button>}>
          <input aria-label="Guest name" />
        </SheetContent>
      </Sheet>,
    );
    const trigger = screen.getByRole('button', { name: 'Filters' });
    await user.click(trigger);
    const sheet = screen.getByRole('dialog', { name: 'Filter bookings' });
    expect(sheet.contains(document.activeElement)).toBe(true);
    // A bottom sheet on phones that pads for the home indicator.
    expect(sheet.className).toContain('bottom-0');
    expect(sheet.innerHTML).toContain('safe-area-inset-bottom');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger).toHaveFocus();
  });
});

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="search">{location.search}</span>;
}

function TabbedPage() {
  const [tab, setTab] = useTabParam('tab', ['earnings', 'payouts', 'methods'] as const, 'earnings');
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      <TabsList aria-label="Finance sections">
        <TabsTrigger value="earnings">Earnings</TabsTrigger>
        <TabsTrigger value="payouts" count={2}>
          Payouts
        </TabsTrigger>
        <TabsTrigger value="methods">Payout methods</TabsTrigger>
      </TabsList>
      <TabsContent value="earnings">Earnings panel</TabsContent>
      <TabsContent value="payouts">Payouts panel</TabsContent>
      <TabsContent value="methods">Methods panel</TabsContent>
    </Tabs>
  );
}

describe('Tabs + useTabParam', () => {
  const renderAt = (url: string) =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <TabbedPage />
        <LocationProbe />
      </MemoryRouter>,
    );

  it('opens the tab named in the URL', () => {
    renderAt('/stays/finance?tab=methods&page=2');
    expect(screen.getByRole('tab', { name: 'Payout methods' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Methods panel');
  });

  it('falls back for an unknown tab', () => {
    renderAt('/stays/finance?tab=hacked');
    expect(screen.getByRole('tab', { name: 'Earnings' })).toHaveAttribute('aria-selected', 'true');
  });

  it('moves with the arrow keys and keeps other query parameters', async () => {
    const user = userEvent.setup();
    renderAt('/stays/finance?page=2');
    screen.getByRole('tab', { name: 'Earnings' }).focus();
    await user.keyboard('{ArrowRight}');
    const payouts = screen.getByRole('tab', { name: /Payouts/ });
    expect(payouts).toHaveFocus();
    expect(payouts).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Payouts panel');
    expect(screen.getByTestId('search').textContent).toBe('?page=2&tab=payouts');
    expect(payouts).toHaveTextContent('2');
  });

  it('removes the parameter when returning to the default tab', async () => {
    const user = userEvent.setup();
    renderAt('/stays/finance?tab=payouts');
    await user.click(screen.getByRole('tab', { name: 'Earnings' }));
    expect(screen.getByTestId('search').textContent).toBe('');
  });
});

describe('StaysSeg', () => {
  it('uses roving focus: one tab stop, arrows move and select', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <StaysSeg
        ariaLabel="Review filter"
        value="All"
        onChange={onChange}
        options={[
          { value: 'All', label: 'All' },
          { value: 'Unreplied', label: 'Unreplied' },
          { value: 'Replied', label: 'Replied' },
        ]}
      />,
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.tabIndex)).toEqual([0, -1, -1]);
    tabs[0].focus();
    await user.keyboard('{ArrowLeft}');
    expect(tabs[2]).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('Replied');
  });
});
