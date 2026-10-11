import * as React from 'react';
import { badgeTone } from '../../../../lib/statusTone.js';
export function Badge({ children, tone='slate' }: { children: React.ReactNode; tone?: 'brand'|'green'|'red'|'slate'|'gold'|'blue' }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badgeTone(tone)}`}>{children}</span>;
}
