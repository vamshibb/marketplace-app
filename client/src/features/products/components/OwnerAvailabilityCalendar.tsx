import { useId } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import { monthDays, monthStart, shiftMonth, utcToday, type AvailabilityDay } from "../../orders/availability";
import { canSelectBlockDate } from "../utils/availabilityBlockRange";

interface Props {
  month: string;
  onMonthChange: (month: string) => void;
  from: string;
  to: string;
  onSelect: (from: string, to: string) => void;
  quantity: number;
  totalQuantity: number;
  days: ReadonlyMap<string, AvailabilityDay>;
  loading: boolean;
  error: boolean;
  retrying: boolean;
  onRetry: () => void;
  disabled: boolean;
}

export const OwnerAvailabilityCalendar = (props: Props) => {
  const headingId = useId();
  const { month, from, to, quantity, totalQuantity, days, disabled } = props;
  const selectingEnd = Boolean(from && !to);
  const monthDate = new Date(`${month}T00:00:00Z`);
  return <section aria-labelledby={headingId} className="h-full min-w-0 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
    <h2 id={headingId} className="font-semibold text-slate-900">Availability calendar</h2>
    <div className="flex items-center justify-between gap-2">
      <Button size="sm" variant="secondary" aria-label="Previous month" disabled={disabled || month <= monthStart(utcToday())} onClick={() => props.onMonthChange(shiftMonth(month, -1))}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
      <p aria-live="polite" className="text-sm font-semibold">{monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" })}</p>
      <Button size="sm" variant="secondary" aria-label="Next month" disabled={disabled} onClick={() => props.onMonthChange(shiftMonth(month, 1))}><ChevronRight className="size-4" aria-hidden="true" /></Button>
    </div>
    <p className="text-xs text-slate-600">{selectingEnd ? "Choose an end date. The end day is not blocked." : "Choose a start date, then an end date. Dates use UTC."}</p>
    {props.loading && <p role="status" className="text-sm text-slate-500">Loading availability...</p>}
    {props.error && <div role="alert" className="space-y-2 text-sm text-red-600"><p>Unable to load this month's availability.</p><Button size="sm" variant="secondary" disabled={props.retrying || disabled} onClick={props.onRetry}>Retry calendar</Button></div>}
    <div className="grid grid-cols-7 gap-1 text-center">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day} className="py-1 text-xs text-slate-500">{day}</span>)}
      {Array.from({ length: monthDate.getUTCDay() }, (_, i) => <span key={`blank-${i}`} aria-hidden="true" />)}
      {monthDays(month).map(date => {
        const day = days.get(date);
        const selectable = canSelectBlockDate(date, from, to, quantity, totalQuantity, days);
        const selected = date === from || date === to;
        const inRange = Boolean(from && to && date > from && date < to);
        const ownerBlocked = (day?.blockedQuantity ?? 0) > 0;
        const state = !day ? "Loading" : day.status === "FULL" ? "Unavailable" : day.status === "PARTIAL" ? "Limited" : "Available";
        const color = !day || day.status === "FULL" ? "bg-slate-100 text-slate-500" : day.status === "PARTIAL" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800";
        return <button type="button" key={date} aria-pressed={selected}
          aria-label={`${date}, ${state}${ownerBlocked ? `, ${day!.blockedQuantity} owner blocked` : ""}${selectingEnd && selectable ? ", available as end date" : ""}`}
          title={day ? `${day.availableQuantity} available, ${day.reservedQuantity} rented, ${day.blockedQuantity} owner blocked` : "Availability not loaded"}
          disabled={disabled || props.loading || props.error || !selectable}
          onClick={() => props.onSelect(selectingEnd ? from : date, selectingEnd ? date : "")}
          className={`relative min-h-9 rounded text-sm focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed ${color} ${selected ? "ring-2 ring-blue-600 font-bold" : inRange ? "ring-1 ring-blue-200" : ""}`}>
          {Number(date.slice(-2))}
          {ownerBlocked && <span aria-hidden="true" className="absolute right-1 bottom-1 size-1.5 rounded-full bg-violet-600" />}
        </button>;
      })}
    </div>
    <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
      <span className="rounded bg-emerald-50 px-1.5 py-1">Available</span><span className="rounded bg-amber-50 px-1.5 py-1">Limited</span><span className="rounded bg-slate-100 px-1.5 py-1">Unavailable</span><span className="flex items-center gap-1 rounded bg-violet-50 px-1.5 py-1"><span className="size-1.5 rounded-full bg-violet-600" />Owner blocked</span>
    </div>
    {from && <Button size="sm" variant="link" disabled={disabled} onClick={() => props.onSelect("", "")}>Clear dates</Button>}
  </section>;
};
