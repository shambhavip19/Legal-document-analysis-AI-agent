import React, { useState, useEffect } from 'react';
import ReactDiffViewer from 'react-diff-viewer';
import { X, Sparkles, Send, Check, AlertCircle, RefreshCw } from 'lucide-react';

export default function NegotiationPanel({ 
  isOpen, 
  onClose, 
  clause, 
  onAcceptProposal, 
  onRejectProposal,
  onRunNegotiation,
  isLoading,
  proposalData 
}) {
  const [feedback, setFeedback] = useState('');
  const [typedRationale, setTypedRationale] = useState('');
  const [rationaleIndex, setRationaleIndex] = useState(0);

  // Reset inputs when a new clause opens
  useEffect(() => {
    setFeedback('');
    setTypedRationale('');
    setRationaleIndex(0);
  }, [clause]);

  // Streaming typing effect for AI rationale
  useEffect(() => {
    if (proposalData && proposalData.rationale) {
      setTypedRationale('');
      setRationaleIndex(0);
    }
  }, [proposalData]);

  useEffect(() => {
    if (proposalData && proposalData.rationale && rationaleIndex < proposalData.rationale.length) {
      const timeout = setTimeout(() => {
        setTypedRationale((prev) => prev + proposalData.rationale[rationaleIndex]);
        setRationaleIndex((prev) => prev + 1);
      }, 15); // Adjust typing speed here
      return () => clearTimeout(timeout);
    }
  }, [proposalData, rationaleIndex]);

  if (!isOpen || !clause) return null;

  const currentVersionText = clause.counterparty_text && clause.has_diff ? clause.counterparty_text : clause.original_text;
  const proposedText = proposalData ? proposalData.proposed_text : '';
  const iteration = proposalData ? proposalData.iteration : 0;
  const status = proposalData ? proposalData.status : 'negotiating';
  const showDiff = proposalData && proposedText && proposedText !== currentVersionText;

  const handleTryAgain = () => {
    onRunNegotiation(clause.id, currentVersionText, iteration, 'try_again', feedback, clause.original_text);
    setFeedback('');
  };

  const handleAccept = () => {
    onAcceptProposal(clause.id, proposedText || currentVersionText);
  };

  const handleReject = () => {
    onRejectProposal(clause.id);
  };

  // Dark Theme custom styles for react-diff-viewer
  const diffStyles = {
    variables: {
      dark: {
        diffViewerBackground: '#0f172a', // slate-900
        diffViewerColor: '#cbd5e1', // slate-300
        addedBackground: '#064e3b', // emerald-950/80
        addedColor: '#34d399', // emerald-400
        removedBackground: '#7f1d1d', // red-950/80
        removedColor: '#f87171', // red-400
        wordAddedBackground: '#047857',
        wordRemovedBackground: '#991b1b',
        emptyLineBackground: '#090d16',
      }
    },
    line: {
      padding: '8px 12px',
      lineHeight: '1.6',
      fontSize: '13px',
      fontFamily: 'Inter, sans-serif',
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300">
      {/* Click outside to close */}
      <div className="flex-1" onClick={onClose} />
      
      {/* Drawer Body */}
      <div className="w-full max-w-4xl bg-slate-950 border-l border-slate-800 h-full flex flex-col shadow-2xl relative">
        {/* Header */}
        <div className="p-6 border-b border-slate-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                Negotiating {clause.id.replace('_', ' ')}
              </span>
              <h2 className="font-display font-bold text-slate-100 text-xl leading-tight">
                {clause.title}
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Diff / Text Panel */}
          <div className="border border-slate-900 rounded-2xl overflow-hidden glass-panel">
            <div className="p-4 bg-slate-900/60 border-b border-slate-900 flex items-center justify-between text-xs font-semibold text-slate-400 tracking-wider">
              <span>{showDiff ? 'PROPOSED COUNTER-PROPOSAL CHANGES' : 'CURRENT CONTRACT TEXT'}</span>
              {iteration > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 text-[10px]">
                  Iteration {iteration}/3
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-200">AI Negotiator is reasoning...</p>
                  <p className="text-xs text-slate-500 mt-1">Retrieving legal precedents and drafting optimal language</p>
                </div>
              </div>
            ) : showDiff ? (
              <ReactDiffViewer
                oldValue={currentVersionText}
                newValue={proposedText}
                splitView={true}
                useDarkTheme={true}
                styles={diffStyles}
                leftTitle="Current Clause Text"
                rightTitle="Proposed AI Counter-proposal"
              />
            ) : (
              <div className="p-6 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {currentVersionText}
              </div>
            )}
          </div>

          {/* Initial Seeding Action */}
          {!proposalData && !isLoading && (
            <div className="p-6 text-center space-y-4">
              <p className="text-slate-400 text-sm">
                Ready to negotiate this clause? LexAgent will analyze the current text against industry standards, retrieve similar precedents, and draft a balanced revision.
              </p>
              <button
                onClick={() => onRunNegotiation(clause.id, currentVersionText, 0, 'start', '', clause.original_text)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-6 rounded-xl font-medium transition-all hover:-translate-y-0.5 inline-flex items-center space-x-2 shadow-lg shadow-indigo-600/10"
              >
                <Sparkles className="h-4 w-4" />
                <span>Initialize Negotiation Loop</span>
              </button>
            </div>
          )}

          {/* AI Rationale & Terminal Output */}
          {proposalData && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">AI Strategy & Rationale</h4>
              <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl font-mono text-xs text-emerald-400 leading-relaxed min-h-[70px] relative overflow-hidden">
                <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[9px] font-sans font-bold bg-emerald-500/15 rounded text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                  Terminal
                </div>
                <span className="text-slate-500">$ cat explanation.txt</span>
                <p className="mt-1 text-slate-300 font-sans text-sm">
                  {typedRationale}
                  {rationaleIndex < proposalData.rationale.length && <span className="cursor-blink">&nbsp;</span>}
                </p>
              </div>
            </div>
          )}

          {/* Iteration Warnings / Info */}
          {status === 'failed' && (
            <div className="flex items-start space-x-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Iteration limit reached</p>
                <p className="text-xs text-red-400/80 mt-1">
                  The agent has run through 3 iterations of proposal updates. The negotiation status has finalized as 'concluded without agreement'. You can accept the last generated version or reject to keep the original.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {proposalData && !isLoading && (
          <div className="p-6 border-t border-slate-900 bg-slate-900/20 space-y-4">
            {/* Feedback input for Try Again */}
            {status !== 'failed' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback (e.g. 'Make it Net 45 instead', 'Reduce liability cap to 1x fees')"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={handleTryAgain}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 px-4 rounded-xl font-medium text-sm flex items-center space-x-1.5 transition-colors shrink-0"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Try Again</span>
                </button>
              </div>
            )}

            {/* Bottom accept/reject rows */}
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 text-slate-300 py-3 px-4 rounded-xl font-medium text-sm transition-colors"
              >
                Reject & Keep Original
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-3 px-4 rounded-xl font-medium text-sm flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/10 transition-all hover:-translate-y-0.5"
              >
                <Check className="h-4 w-4" />
                <span>Accept Proposed Version</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
