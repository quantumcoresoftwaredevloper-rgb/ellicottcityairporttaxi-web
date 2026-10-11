import { serviceIcon } from '../../lib/iconMap.js';

/**
 * Renders a catalog service's icon from its stored name, falling back to a car.
 * Catalog `icon` is a string key, so it must be resolved before rendering.
 */
export default function ServiceIcon({ name, className = 'h-5 w-5' }) {
  const Icon = serviceIcon(name);
  return <Icon className={className} />;
}
