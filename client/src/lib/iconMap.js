import {
  Car, CarFront, Bus, Truck, Plane, Briefcase, Gem, PartyPopper, MoonStar,
  Heart, School, Star, ShieldCheck, Clock, Users, MapPin, Sparkles, Music,
  GraduationCap, Building2, Luggage, Route, Accessibility,
} from 'lucide-react';

// Fleet and service `icon` fields store a *name*, not a component, because a
// React component cannot be persisted. This is the only place a name is turned
// back into an icon — the admin pickers render these same options so an admin
// can only choose an icon that actually resolves.
export const ICONS = {
  car: Car,
  carFront: CarFront,
  bus: Bus,
  truck: Truck,
  plane: Plane,
  briefcase: Briefcase,
  building: Building2,
  gem: Gem,
  partyPopper: PartyPopper,
  moonStar: MoonStar,
  heart: Heart,
  school: School,
  graduation: GraduationCap,
  star: Star,
  shield: ShieldCheck,
  clock: Clock,
  users: Users,
  mapPin: MapPin,
  sparkles: Sparkles,
  music: Music,
  luggage: Luggage,
  route: Route,
  accessibility: Accessibility,
};

export const ICON_NAMES = Object.keys(ICONS);

export const serviceIcon = (name) => ICONS[name] || Car;

// The old string-matching heuristic in Reservations.jsx ("van"/"coach" -> Bus).
// Kept as a last-resort so an unrecognised key still gets a sensible icon.
export const vehicleIconByKey = (key = '') => {
  const k = String(key).toLowerCase();
  if (/coach|bus|motorcoach/.test(k)) return Bus;
  if (/van|shuttle/.test(k)) return Bus;
  if (/suv|truck/.test(k)) return CarFront;
  return Car;
};
