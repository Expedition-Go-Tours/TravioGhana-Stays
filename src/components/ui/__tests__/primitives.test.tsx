import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Link } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardFooter,
  CardHeader,
  Checkbox,
  Field,
  IconButton,
  Input,
  Money,
  NativeSelect,
  ScoreBadge,
  StatCard,
  StatusBadge,
  Switch,
  Textarea,
  initialsOf,
  scoreLabel,
} from '..';
import { STATUS_TONES, type StatusDomain } from '@/lib/statusTones';

describe('Button', () => {
  it('is a 44px type="button" by default and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('h-11');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies variants and sizes', () => {
    render(
      <>
        <Button variant="primary">Primary</Button>
        <Button size="sm">Small</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Primary' })).toHaveClass('bg-brand');
    expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('h-9');
  });

  it('loading disables the button, marks it busy and blocks clicks', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Pay
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Pay' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('asChild renders a link with button styling', () => {
    render(
      <MemoryRouter>
        <Button asChild variant="primary">
          <Link to="/stays/properties">Properties</Link>
        </Button>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Properties' });
    expect(link).toHaveAttribute('href', '/stays/properties');
    expect(link).toHaveClass('bg-brand');
  });

  it('IconButton is named by its aria-label', () => {
    render(<IconButton aria-label="Close">x</IconButton>);
    expect(screen.getByRole('button', { name: 'Close' })).toHaveClass('h-11', 'w-11');
  });
});

describe('Card', () => {
  it('renders header, body and footer slots', () => {
    render(
      <Card as="section" aria-label="Summary">
        <CardHeader title="Recent reservations" description="Last 7 days" actions={<Button>All</Button>} />
        <p>Body</p>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    const card = screen.getByRole('region', { name: 'Summary' });
    expect(card.tagName).toBe('SECTION');
    expect(screen.getByRole('heading', { name: 'Recent reservations' })).toBeTruthy();
    expect(screen.getByText('Last 7 days')).toBeTruthy();
    expect(screen.getByText('Footer')).toBeTruthy();
  });
});

describe('Badge and StatusBadge', () => {
  it('renders a tone with an optional dot', () => {
    const { container } = render(
      <Badge tone="success" dot>
        Paid
      </Badge>,
    );
    expect(screen.getByText('Paid')).toBeTruthy();
    expect(container.firstChild).toHaveClass('bg-success-soft', 'text-success');
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass('bg-success');
  });

  it('renders every known status in every domain with its mapped label', () => {
    for (const [domain, entries] of Object.entries(STATUS_TONES)) {
      for (const [status, entry] of Object.entries(entries)) {
        const { unmount } = render(<StatusBadge domain={domain as StatusDomain} status={status} />);
        expect(screen.getByText(entry.label)).toBeTruthy();
        unmount();
      }
    }
  });

  it('lets a page override the label', () => {
    render(<StatusBadge domain="payout" status="PAID" label="Sent to bank" />);
    expect(screen.getByText('Sent to bank')).toBeTruthy();
  });
});

describe('Field and inputs', () => {
  it('names the control with its label and describes it with the hint', () => {
    render(
      <Field label="Property name" hint="As guests will see it" required>
        <Input />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: /Property name/ });
    expect(input).toHaveAccessibleDescription('As guests will see it');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('an error marks the control invalid and replaces the hint', () => {
    render(
      <Field label="Email" hint="We never share it" error="Enter a valid email">
        <Input type="email" />
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
    expect(screen.queryByText('We never share it')).toBeNull();
  });

  it('clicking the label focuses the control', async () => {
    render(
      <Field label="Notes">
        <Textarea />
      </Field>,
    );
    await userEvent.click(screen.getByText('Notes'));
    expect(screen.getByRole('textbox', { name: 'Notes' })).toHaveFocus();
  });

  it('inputs are 44px tall, with optional leading content', () => {
    render(<Input aria-label="Price" leading="USD" />);
    expect(screen.getByRole('textbox', { name: 'Price' })).toHaveClass('h-11', 'pl-10');
    expect(screen.getByText('USD')).toBeTruthy();
  });

  it('NativeSelect works with a label', async () => {
    const onChange = vi.fn();
    render(
      <Field label="Currency">
        <NativeSelect value="USD" onChange={onChange}>
          <option value="USD">USD</option>
          <option value="GHS">GHS</option>
        </NativeSelect>
      </Field>,
    );
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Currency' }), 'GHS');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('Checkbox', () => {
  it('toggles from its label', async () => {
    render(<Checkbox label="Breakfast included" description="Shown on the listing" />);
    const box = screen.getByRole('checkbox', { name: 'Breakfast included' });
    expect(box).not.toBeChecked();
    await userEvent.click(screen.getByText('Breakfast included'));
    expect(box).toBeChecked();
  });
});

describe('Switch', () => {
  it('is a labelled switch that toggles with click and keyboard', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch label="Instant booking" description="Guests book without waiting" onCheckedChange={onCheckedChange} />);
    const control = screen.getByRole('switch', { name: 'Instant booking' });
    expect(control).toHaveAttribute('aria-checked', 'false');
    expect(control).toHaveAccessibleDescription('Guests book without waiting');

    await userEvent.click(control);
    expect(onCheckedChange).toHaveBeenLastCalledWith(true);
    expect(control).toHaveAttribute('aria-checked', 'true');

    control.focus();
    await userEvent.keyboard(' ');
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it('respects disabled', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Promo" disabled onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Promo' }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe('Avatar', () => {
  it('falls back to initials without a photo', () => {
    render(<Avatar name="Ama Kofi Boateng" />);
    expect(screen.getByRole('img', { name: 'Ama Kofi Boateng' })).toHaveTextContent('AB');
  });

  it('initialsOf', () => {
    expect(initialsOf('Sarah')).toBe('S');
    expect(initialsOf('  ')).toBe('?');
    expect(initialsOf('Travio Ghana Stays (demo)')).toBe('TS');
    expect(initialsOf('Kwame — Front desk')).toBe('KD');
    expect(initialsOf('Ẹ̀wà Adébáyọ̀')).toBe('ẸA');
  });
});

describe('ScoreBadge', () => {
  it.each([
    [10, 'Exceptional'],
    [9, 'Exceptional'],
    [8.9, 'Very good'],
    [8, 'Very good'],
    [7.9, 'Good'],
    [7, 'Good'],
    [6, 'Pleasant'],
    [5.9, 'Review score'],
  ])('%s → %s', (score, label) => {
    expect(scoreLabel(score)).toBe(label);
  });

  it('converts star ratings to a score out of 10 and announces it', () => {
    render(<ScoreBadge stars={4.3} reviewCount={12} />);
    expect(screen.getByRole('img', { name: 'Scored 8.6 out of 10, Very good, 12 reviews' })).toBeTruthy();
    expect(screen.getByText('8.6')).toBeTruthy();
  });

  it('renders nothing without a score', () => {
    const { container } = render(<ScoreBadge />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Money', () => {
  it('formats in tabular figures', () => {
    render(<Money amount={1530} />);
    expect(screen.getByText('$1,530.00')).toHaveClass('figures');
  });

  it('compact keeps the full amount for tooltips and screen readers', () => {
    render(<Money amount={12400} compact />);
    const money = screen.getByLabelText('$12,400.00');
    expect(money).toHaveAttribute('title', '$12,400.00');
    expect(money).toHaveTextContent('$12.4K');
  });
});

describe('StatCard', () => {
  it('shows label, value, hint and an up/down change', () => {
    const { rerender } = render(<StatCard label="Arrivals" value="12" hint="Next 7 days" change={12.5} changeLabel="vs last week" />);
    expect(screen.getByText('Arrivals')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('Next 7 days')).toBeTruthy();
    expect(screen.getByText('Up')).toBeTruthy();
    expect(screen.getByText(/12\.5%/)).toBeTruthy();

    rerender(<StatCard label="Arrivals" value="12" change={-4} />);
    expect(screen.getByText('Down')).toBeTruthy();
  });
});
