import { Card, CardTitle } from '../../components/ui/card';
import { useDriverProfile } from '../../hooks/useDriverQuery';
import { useCatalog } from '../../../../context/CatalogContext.jsx';
import { Car } from 'lucide-react';

export default function VehiclePage() {
  const { data } = useDriverProfile() as any;
  const d = data?.user?.driverDetails || {};
  const { vehicleByKey } = useCatalog();

  // The class an admin manages in /admin/content → Fleet, not a hardcoded
  // image. A driver on a class that was renamed or retired still sees a
  // readable label instead of a raw key.
  const cls = vehicleByKey(d.vehicleType);
  const key = d.vehicleType || 'economy-sedan';

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold dark:text-white">Vehicle</h1>
      <Card className="flex gap-6 flex-wrap">
        {cls?.image ? (
          <img src={cls.image} alt={cls.label} className="h-32 w-48 rounded-2xl object-cover border border-accent-200" />
        ) : (
          <div className="grid h-32 w-48 place-items-center rounded-2xl border border-accent-200 bg-accent-50 text-brand-300 dark:bg-white/5">
            <Car className="h-10 w-10" />
          </div>
        )}
        <div>
          <p className="font-display font-bold">
            {cls?.label || key} • {d.plateNumber || '—'}
          </p>
          <p className="text-sm text-muted">Year 2022 • Insurance • Registration • Inspection • Fuel: Gas • Mileage 42,100 mi</p>
          {cls?.tagline && <p className="mt-1 text-sm text-brand-600">{cls.tagline}</p>}
          {cls?.fare && (
            <p className="mt-1 text-xs text-muted">
              Class rate: ${cls.fare.base} base + ${cls.fare.perKm}/km + ${cls.fare.perMin}/min
            </p>
          )}
          {!cls && (
            <p className="mt-2 rounded-xl bg-gold-50 px-3 py-1.5 text-xs text-gold-700 dark:bg-white/5">
              This class (<code>{key}</code>) is no longer in the active fleet catalog — ask an admin to reactivate or reassign it.
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <span className="rounded-full bg-accent-50 px-2.5 py-1 dark:bg-white/5">Insurance exp 2027-03-12</span>
            <span className="rounded-full bg-gold-50 px-2.5 py-1 text-gold-700">Service due in 1,200 mi</span>
          </div>
        </div>
      </Card>
      <Card>
        <CardTitle>Class amenities</CardTitle>
        {(cls?.features?.length ? cls.features : ['Ask an admin to add amenities to this class in Content → Fleet.']).map((f: string) => (
          <p key={f} className="mt-1 text-sm text-muted">
            • {f}
          </p>
        ))}
      </Card>
    </div>
  );
}
