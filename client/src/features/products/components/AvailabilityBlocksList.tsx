import { Button } from "../../../shared/ui/Button";
import type { AvailabilityBlock } from "../availabilityBlockTypes";

export const AvailabilityBlocksList = ({ blocks, pending, onRemove }: { blocks: AvailabilityBlock[]; pending: boolean; onRemove: (id: string) => void }) => (
  <section className="space-y-2 border-t border-slate-200 pt-3" aria-labelledby="existing-blocks-heading">
    <h2 id="existing-blocks-heading" className="text-sm font-semibold text-slate-900">Existing owner blocks</h2>
    {blocks.length === 0 ? <p className="text-sm text-slate-500">No availability blocks yet.</p> : <ul className="divide-y divide-slate-100">
      {blocks.map(block => <li key={block.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2">
        <div className="min-w-0 space-y-0.5 text-xs">
          <p className="font-medium text-slate-800 tabular-nums">{block.blockedFrom} &rarr; {block.blockedTo}</p>
          <p className="text-slate-600">Quantity: {block.quantity} &middot; End date excluded</p>
          {block.reason && <p className="whitespace-pre-wrap wrap-anywhere text-slate-600">{block.reason}</p>}
        </div>
        <Button size="sm" variant="secondary" disabled={pending} aria-label={`Remove block ${block.blockedFrom} to ${block.blockedTo}`} onClick={() => {
          if (window.confirm(`Remove the availability block from ${block.blockedFrom} to ${block.blockedTo}?`)) onRemove(block.id);
        }}>Remove Block</Button>
      </li>)}
    </ul>}
  </section>
);
