import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Scale, AlertCircle, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import RiskBadge from './RiskBadge';

export default function ClauseCard({ clause, onNegotiate, mode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const textToShow = clause.counterparty_text && clause.has_diff ? clause.counterparty_text : clause.original_text;

  const getFavorsText = (favors) => {
    if (favors === 'user') return 'Favors: User';
    if (favors === 'counterparty') return 'Favors: Counterparty';
    return 'Favors: Neutral / Balanced';
  };

  const getFavorsBadgeColor = (favors) => {
    if (favors === 'user') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (favors === 'counterparty') return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const isNegotiated = clause.negotiation_status === 'accepted';
  const isFailed = clause.negotiation_status === 'failed';
  const isUnderNegotiation = clause.negotiation_status === 'negotiating';

  return (
    <div className={`glass-panel rounded-2xl p-6 transition-all duration-300 border flex flex-col justify-between ${
      isNegotiated 
        ? 'border-emerald-500/40 bg-emerald-950/10 shadow-lg shadow-emerald-500/5' 
        : isFailed 
        ? 'border-red-500/40 bg-red-950/10 shadow-lg shadow-red-500/5'
        : 'border-slate-800/80 hover:border-slate-700/80'
    }`}>
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-400">
              {clause.id.replace('_', ' ')}
            </span>
            <h3 className="font-display font-bold text-slate-100 text-lg leading-tight mt-0.5">
              {clause.title}
            </h3>
          </div>
          {clause.risk_level && <RiskBadge level={clause.risk_level} />}
        </div>

        {/* Diff Badge in Compare Mode */}
        {mode === 'compare' && clause.has_diff && !isNegotiated && !isFailed && (
          <div className="mb-4 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 text-xs font-medium">
            <AlertCircle className="h-3 w-3" />
            <span>Counterparty Modified</span>
          </div>
        )}

        {/* Current State / Negotiation Status */}
        {isNegotiated && (
          <div className="mb-4 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Counter-Proposal Accepted</span>
          </div>
        )}

        {isFailed && (
          <div className="mb-4 inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20 text-xs font-semibold">
            <XCircle className="h-3.5 w-3.5" />
            <span>Negotiation Concluded without Agreement</span>
          </div>
        )}

        {/* Risk Explanation Section */}
        {clause.explanation && (
          <div className="mb-4 p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-300 leading-relaxed">
            <p className="font-semibold text-slate-400 mb-1">Risk Analysis</p>
            {clause.explanation}
          </div>
        )}

        {/* Clause Preview and Expandable Text */}
        <div className="text-sm text-slate-300 mt-2 mb-4 leading-relaxed whitespace-pre-wrap">
          {isExpanded ? (
            textToShow
          ) : (
            `${textToShow.substring(0, 150)}${textToShow.length > 150 ? '...' : ''}`
          )}
          {textToShow.length > 150 && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center ml-2 space-x-0.5"
            >
              <span>{isExpanded ? 'Show less' : 'Read full clause'}</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="pt-4 border-t border-slate-900/60 flex items-center justify-between gap-3 mt-auto">
        {clause.favors ? (
          <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${getFavorsBadgeColor(clause.favors)} flex items-center space-x-1`}>
            <Scale className="h-3 w-3" />
            <span>{getFavorsText(clause.favors)}</span>
          </span>
        ) : (
          <div />
        )}

        {clause.risk_level && (
          <button
            onClick={() => onNegotiate(clause)}
            disabled={isNegotiated}
            className={`py-2 px-4 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-all shadow-sm ${
              isNegotiated 
                ? 'bg-slate-800/40 text-slate-500 cursor-not-allowed border border-slate-700/10' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-slate-100 hover:shadow-indigo-600/10 shadow-md hover:-translate-y-0.5'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{isNegotiated ? 'Negotiated' : isFailed ? 'Renegotiate' : 'Negotiate Clause'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
