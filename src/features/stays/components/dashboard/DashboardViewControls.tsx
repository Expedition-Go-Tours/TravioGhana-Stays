import {
  Button,
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Eye, SlidersHorizontal } from "@/features/stays/icons";
import type { DashboardDensity } from "./dashboardModel";

/**
 * Download / Customise data / Customise view, shared by all three dashboard
 * tables. The column list is the table's own config, so a tab can never show
 * a column toggle that does not exist.
 */
export default function DashboardViewControls<K extends string>({
  columns,
  hiddenColumns,
  onToggleColumn,
  density,
  onDensityChange,
  onDownload,
  canDownload,
}: {
  columns: { key: K; label: string; mandatory?: boolean }[];
  hiddenColumns: K[];
  onToggleColumn: (key: K) => void;
  density: DashboardDensity;
  onDensityChange: (density: DashboardDensity) => void;
  onDownload: () => void;
  canDownload: boolean;
}) {
  const optionalColumns = columns.filter((column) => !column.mandatory);
  const mandatoryLabels = columns.filter((column) => column.mandatory).map((column) => column.label);
  const mandatoryText =
    mandatoryLabels.length > 1
      ? `${mandatoryLabels.slice(0, -1).join(", ")} and ${mandatoryLabels[mandatoryLabels.length - 1]}`
      : mandatoryLabels[0] ?? "Required columns";

  return (
    <>
      <Button variant="ghost" size="sm" onClick={onDownload} disabled={!canDownload}>
        <Download size={15} aria-hidden="true" />
        Download
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm">
            <SlidersHorizontal size={15} aria-hidden="true" />
            Customise data
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-2">
          <p className="px-2 pb-1 pt-1 text-overline font-bold uppercase text-muted">Show columns</p>
          {optionalColumns.map((column) => (
            <Checkbox
              key={column.key}
              label={column.label}
              checked={!hiddenColumns.includes(column.key)}
              onChange={() => onToggleColumn(column.key)}
            />
          ))}
          <p className="border-t border-hairline px-2 pt-2 text-caption text-muted">
            {mandatoryText} always stay visible.
          </p>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <Eye size={15} aria-hidden="true" />
            Customise view
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="px-3 pb-1 pt-2 text-overline font-bold uppercase text-muted">
            Row density
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={density}
            onValueChange={(value: string) => onDensityChange(value as DashboardDensity)}
          >
            <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
