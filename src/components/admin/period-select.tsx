import { Calendar } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalyticsPeriod } from "@/lib/api/analytics";
import { ANALYTICS_PERIODS, parsePeriod, periodLabel } from "@/lib/admin/analytics-period";

/**
 * Window selector for any analytics-backed page.
 *
 * The dashboard's old control was a button that flipped between 30 and 7, so the
 * 90-day and all-time windows the backend already served were unreachable. A
 * select exposes all four and reads as a filter rather than as an action.
 */
export function PeriodSelect({
  value,
  onChange,
  disabled,
}: {
  value: AnalyticsPeriod;
  onChange: (period: AnalyticsPeriod) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={String(value)}
      onValueChange={(raw) => onChange(parsePeriod(raw, value))}
      disabled={disabled}
    >
      <SelectTrigger className="h-9 w-[150px]" aria-label="Reporting period">
        <Calendar className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ANALYTICS_PERIODS.map((period) => (
          <SelectItem key={period} value={String(period)}>
            {periodLabel(period)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
