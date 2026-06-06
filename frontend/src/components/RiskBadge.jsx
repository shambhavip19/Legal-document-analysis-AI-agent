import React from 'react';
import { ShieldAlert, ShieldCheck, ShieldAlert as ShieldWarning } from 'lucide-react';

export default function RiskBadge({ level }) {
  const normLevel = (level || 'LOW').toUpperCase();
  
  if (normLevel === 'HIGH') {
    return (
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30 glow-red">
        <ShieldAlert className="h-3.5 w-3.5" />
        <span>High Risk</span>
      </span>
    );
  }
  
  if (normLevel === 'MEDIUM') {
    return (
      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 glow-yellow">
        <ShieldWarning className="h-3.5 w-3.5" />
        <span>Medium Risk</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 glow-green">
      <ShieldCheck className="h-3.5 w-3.5" />
      <span>Low Risk</span>
    </span>
  );
}
