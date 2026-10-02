import { useId, type ReactElement } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../../../shared/ui/Button";
import type { AvailabilityDay } from "../availabilityTypes";
import type { OrderRequestProduct } from "./RequestOrderButton";
import { monthDays, monthStart, shiftMonth, utcToday } from "../utils/rentalCalendarDates";
import { rentalRangeError } from "../utils/rentalRangeAvailability";

interface RentalCalendarProps {
  product: OrderRequestProduct;
  month: string;
  onMonthChange: (month: string) => void;
  from?: string;
  to?: string;
  onSelect: (from: string, to: string) => void;
  quantity: number;
  availability: ReadonlyMap<string, AvailabilityDay>;
  loading: boolean;
  error: boolean;
  retrying: boolean;
  onRetry: () => void;
  disabled: boolean;
  rangeError: string | null;
}

export const RentalCalendar = (props: RentalCalendarProps): ReactElement => {
  const { product, month, from, to, quantity, availability, disabled } = props;
  const headingId = useId();
  const today = utcToday();
  const selectingReturn = Boolean(from && !to);
  const validQuantity = Number.isInteger(quantity) && quantity > 0 && quantity <= product.quantityAvailable;
  const offset = new Date(`${month}T00:00:00Z`).getUTCDay();
  const monthLabel = new Date(`${month}T00:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
  return <section aria-labelledby={headingId} className="space-y-3 rounded-lg border border-slate-200 p-3">
    <div className="flex items-center justify-between gap-2">
      <Button size="sm" variant="secondary" aria-label="Previous month" disabled={disabled || month <= monthStart(today)} onClick={() => props.onMonthChange(shiftMonth(month, -1))}><ChevronLeft className="size-4" aria-hidden="true" /></Button>
      <h3 id={headingId} aria-live="polite" className="text-sm font-semibold text-slate-800">{monthLabel}</h3>
      <Button size="sm" variant="secondary" aria-label="Next month" disabled={disabled} onClick={() => props.onMonthChange(shiftMonth(month, 1))}><ChevronRight className="size-4" aria-hidden="true" /></Button>
    </div>
    <p className="text-xs text-slate-600">{selectingReturn ? "Choose a return date. The return day does not consume inventory." : "Choose a start date, then a return date. Dates use UTC."}</p>
    {props.loading && <p role="status" className="text-xs text-slate-500">Loading availability...</p>}
    {props.error && <div role="alert" className="space-y-1 text-xs text-red-600">
      <p>Unable to load availability.</p>
      <Button size="sm" variant="secondary" disabled={props.retrying || disabled} onClick={props.onRetry}>Retry</Button>
    </div>}
    <div className="grid grid-cols-7 gap-1 text-center">
      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <span key={day} className="py-1 text-xs text-slate-500">{day}</span>)}
      {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
      {monthDays(month).map(date => {
        const day = availability.get(date);
        const canOccupy = Boolean(day && day.status !== "FULL" && day.availableQuantity >= quantity && validQuantity);
        const candidateError = selectingReturn ? rentalRangeError(product, quantity, from, date, availability) : null;
        const selectable = date >= today && validQuantity && (selectingReturn ? !candidateError : canOccupy);
        const selected = date === from || date === to;
        const inRange = Boolean(from && to && date > from && date < to);
        const status = !day ? "Loading" : !canOccupy ? "Unavailable" : day.status === "PARTIAL" ? "Limited availability" : "Available";
        const color = !canOccupy ? "bg-slate-100 text-slate-400" : day?.status === "PARTIAL" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800";
        return <button key={date} type="button" aria-pressed={selected}
          aria-label={`${date}, ${status}${selectingReturn && selectable ? ", available as return date" : ""}`}
          title={candidateError ?? (day ? `${day.availableQuantity} available for occupancy` : "Loading availability")}
          disabled={disabled || props.loading || props.error || !selectable}
          onClick={() => props.onSelect(selectingReturn ? from! : date, selectingReturn ? date : "")}
          className={`min-h-9 rounded text-sm focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed ${color} ${selected ? "ring-2 ring-blue-600 font-bold" : inRange ? "ring-1 ring-blue-200" : ""}`}>
          {Number(date.slice(-2))}
        </button>;
      })}
    </div>
    <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
      <span className="rounded bg-emerald-50 px-1.5 py-1">Available</span>
      <span className="rounded bg-amber-50 px-1.5 py-1">Limited availability</span>
      <span className="rounded bg-slate-100 px-1.5 py-1">Unavailable</span>
    </div>
    {from && <Button size="sm" variant="link" disabled={disabled} onClick={() => props.onSelect("", "")}>Clear dates</Button>}
    {props.rangeError && from && to && <p role="alert" className="text-xs text-red-600">{props.rangeError}</p>}
  </section>;
};
