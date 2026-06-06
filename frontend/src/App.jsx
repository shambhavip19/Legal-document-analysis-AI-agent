import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import UploadZone from './components/UploadZone';
import ClauseCard from './components/ClauseCard';
import NegotiationPanel from './components/NegotiationPanel';
import { FileText, ArrowRight, Download, RefreshCw, Layers, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState(1); // 1: Upload, 2: Analysis & Cards, 3: Export
  const [mode, setMode] = useState('single'); // 'single' or 'compare'
  const [clauses, setClauses] = useState([]);
  const [activeClause, setActiveClause] = useState(null);
  const [proposalData, setProposalData] = useState(null);
  
  // Loading states
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isNegotiating, setIsNegotiating] = useState(false);
  
  // Filtering states for Clause Cards grid
  const [filter, setFilter] = useState('all'); // 'all', 'high', 'medium', 'low', 'negotiated'

  // Health check on load
  const [apiConnected, setApiConnected] = useState(false);
  useEffect(() => {
    api.checkHealth()
      .then(() => setApiConnected(true))
      .catch((err) => {
        console.error('FastAPI Connection Error:', err);
        setApiConnected(false);
      });
  }, []);

  const handleUpload = async (uploadedFiles) => {
    setIsUploading(true);
    try {
      const result = await api.uploadDocuments(uploadedFiles);
      setMode(result.mode);
      setClauses(result.clauses);
      
      // Auto run risk analysis once uploaded
      setIsUploading(false);
      setIsAnalyzing(true);
      
      const analysisResult = await api.analyzeClauses(result.clauses);
      setClauses(analysisResult.clauses);
      setStep(2);
    } catch (error) {
      alert(`Upload/Analysis failed: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  const handleOpenNegotiation = (clause) => {
    setActiveClause(clause);
    // If we have existing proposal details from a previous attempt on this clause, load them.
    if (clause.negotiated_proposal) {
      setProposalData(clause.negotiated_proposal);
    } else {
      setProposalData(null);
    }
  };

  const handleRunNegotiation = async (clauseId, textToNegotiate, currentIteration, feedbackAction, feedbackText, originalText) => {
    setIsNegotiating(true);
    try {
      const response = await api.negotiateClause(
        clauseId,
        textToNegotiate,
        currentIteration,
        feedbackText,
        originalText
      );
      setProposalData(response);
    } catch (error) {
      alert(`Negotiation proposal generation failed: ${error.message}`);
    } finally {
      setIsNegotiating(false);
    }
  };

  const handleAcceptProposal = (clauseId, acceptedText) => {
    setClauses((prevClauses) =>
      prevClauses.map((c) =>
        c.id === clauseId
          ? { 
              ...c, 
              // Store final negotiated text as counterparty_text (or counterparty_text matches if we show it)
              counterparty_text: acceptedText,
              has_diff: acceptedText !== c.original_text,
              negotiation_status: 'accepted',
              negotiated_proposal: proposalData // save state reference
            }
          : c
      )
    );
    setActiveClause(null);
    setProposalData(null);
  };

  const handleRejectProposal = (clauseId) => {
    setClauses((prevClauses) =>
      prevClauses.map((c) =>
        c.id === clauseId
          ? { 
              ...c, 
              negotiation_status: 'failed',
              negotiated_proposal: proposalData // save state reference
            }
          : c
      )
    );
    setActiveClause(null);
    setProposalData(null);
  };

  const handleExportContract = async () => {
    // Build list of final texts
    const compiledClauses = clauses.map((c) => {
      // Use negotiated text if accepted, else use counterparty (if compared and changed), else original
      let finalBodyText = c.original_text;
      if (c.negotiation_status === 'accepted' && c.negotiated_proposal) {
        finalBodyText = c.negotiated_proposal.proposed_text;
      } else if (mode === 'compare' && c.counterparty_text) {
        finalBodyText = c.counterparty_text;
      }
      return {
        title: c.title,
        text: finalBodyText
      };
    });

    try {
      await api.exportContract(compiledClauses);
    } catch (error) {
      alert(`Failed to export document: ${error.message}`);
    }
  };

  const handleReset = () => {
    setClauses([]);
    setStep(1);
    setProposalData(null);
    setActiveClause(null);
  };

  // Filtering Logic
  const filteredClauses = clauses.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'high') return c.risk_level?.toUpperCase() === 'HIGH';
    if (filter === 'medium') return c.risk_level?.toUpperCase() === 'MEDIUM';
    if (filter === 'low') return c.risk_level?.toUpperCase() === 'LOW';
    if (filter === 'negotiated') return c.negotiation_status === 'accepted';
    return true;
  });

  // Risk Counts for stats cards
  const highRiskCount = clauses.filter((c) => c.risk_level?.toUpperCase() === 'HIGH').length;
  const medRiskCount = clauses.filter((c) => c.risk_level?.toUpperCase() === 'MEDIUM').length;
  const negotiatedCount = clauses.filter((c) => c.negotiation_status === 'accepted').length;

  return (
    <div className="min-h-screen flex flex-col relative pb-12">
      {/* Background ambient grids */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse-slow -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse-slow -z-10" />

      {/* Navbar */}
      <header className="glass-panel border-b border-slate-900 sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={handleReset}>
            <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2.5 rounded-xl text-white shadow-md shadow-indigo-600/20">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
                LexAgent
              </h1>
              <p className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">AI Legal Negotiator</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Health check badge */}
            <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
              apiConnected 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${apiConnected ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`} />
              <span>{apiConnected ? 'Connected' : 'Offline'}</span>
            </span>

            {step > 1 && (
              <button 
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {/* STEP 1: UPLOAD SCREEN */}
        {step === 1 && (
          <div className="space-y-8 py-8">
            <div className="text-center max-w-2xl mx-auto space-y-4">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-3.5 py-1.5 rounded-full border border-indigo-500/10">
                Next-Gen AI Agentic Negotiations
              </span>
              <h2 className="font-display font-extrabold text-4xl sm:text-5xl text-slate-100 leading-tight">
                Review & counter-propose legal terms in seconds
              </h2>
              <p className="text-slate-400 text-base">
                Upload your contract draft (or counterparty's mark-up side by side) and let our RAG-enabled LangGraph agent analyze exposure, find precedents, and generate negotiation drafts.
              </p>
            </div>

            {/* Ingestion & analysis loaders */}
            {isAnalyzing ? (
              <div className="w-full max-w-xl mx-auto glass-panel p-8 rounded-2xl border border-slate-900 text-center space-y-6">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 border-4 border-indigo-500/15 rounded-full" />
                  <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-100">Running Multi-Agent Risk Analysis</h3>
                  <p className="text-slate-500 text-xs mt-1.5 max-w-md mx-auto leading-relaxed">
                    Executing LangGraph retrieve nodes. Querying local vector store for templates, validating clauses, and generating risk metrics...
                  </p>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            ) : (
              <UploadZone onUpload={handleUpload} isLoading={isUploading} />
            )}
          </div>
        )}

        {/* STEP 2: ANALYSIS & CARDS GRID */}
        {step === 2 && (
          <div className="space-y-8">
            {/* Stats / Overview row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="glass-panel p-5 rounded-2xl border border-slate-900 flex items-center space-x-4">
                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Sections</p>
                  <p className="text-2xl font-display font-bold text-slate-100">{clauses.length}</p>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-900 flex items-center space-x-4">
                <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">High Risk Exposure</p>
                  <p className="text-2xl font-display font-bold text-slate-100">{highRiskCount}</p>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-900 flex items-center space-x-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Accepted Rewrites</p>
                  <p className="text-2xl font-display font-bold text-slate-100">{negotiatedCount}</p>
                </div>
              </div>

              <div className="glass-panel p-5 rounded-2xl border border-slate-900 flex flex-col justify-center">
                <button
                  onClick={() => setStep(3)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/10 transition-all hover:-translate-y-0.5 flex items-center justify-center space-x-2"
                >
                  <span>Review & Export</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-900 pb-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All Clauses' },
                  { id: 'high', label: 'High Risk' },
                  { id: 'medium', label: 'Medium Risk' },
                  { id: 'low', label: 'Low Risk' },
                  { id: 'negotiated', label: 'Negotiated' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setFilter(btn.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                      filter === btn.id
                        ? 'bg-indigo-600/15 text-indigo-400 border-indigo-500/30'
                        : 'bg-transparent text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Showing {filteredClauses.length} of {clauses.length} items
              </p>
            </div>

            {/* Grid layout */}
            {filteredClauses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredClauses.map((c) => (
                  <ClauseCard 
                    key={c.id} 
                    clause={c} 
                    onNegotiate={handleOpenNegotiation} 
                    mode={mode}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 glass-panel rounded-2xl border border-slate-900">
                <p className="text-slate-500 text-sm">No clauses found matching your filter selection.</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: EXPORT SCREEN */}
        {step === 3 && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-3">
              <h2 className="font-display font-extrabold text-3xl text-slate-100">Final Contract Export</h2>
              <p className="text-slate-400 text-sm max-w-xl mx-auto">
                Review a comprehensive list of all edits, counter-proposals, and accepted items before exporting the document back to a clean DOCX format.
              </p>
            </div>

            {/* Summary Statistics Card */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-900 divide-y divide-slate-900">
              <div className="pb-4 flex justify-between items-center text-sm">
                <span className="text-slate-400">Total processed contract clauses</span>
                <span className="font-semibold text-slate-200">{clauses.length}</span>
              </div>
              <div className="py-4 flex justify-between items-center text-sm">
                <span className="text-slate-400">Accepted counter-proposals</span>
                <span className="font-semibold text-emerald-400">+{negotiatedCount}</span>
              </div>
              <div className="py-4 flex justify-between items-center text-sm">
                <span className="text-slate-400">Remaining unchanged / counterparty clauses</span>
                <span className="font-semibold text-slate-300">{clauses.length - negotiatedCount}</span>
              </div>
              <div className="pt-4 flex justify-between items-center text-sm">
                <span className="text-slate-400">Unresolved high-risk elements</span>
                <span className="font-semibold text-red-400">{highRiskCount - clauses.filter((c) => c.risk_level?.toUpperCase() === 'HIGH' && c.negotiation_status === 'accepted').length}</span>
              </div>
            </div>

            {/* List of changes summary */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Change Log Summary</h4>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {clauses.map((c) => (
                  <div key={c.id} className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-slate-200">{c.title}</p>
                      <p className="text-slate-500 mt-0.5">
                        {c.negotiation_status === 'accepted' 
                          ? 'Negotiated counter-proposal accepted.' 
                          : c.negotiation_status === 'failed' 
                          ? 'Negotiation loop exited without agreement.'
                          : 'Original contract wording kept.'
                        }
                      </p>
                    </div>
                    <div>
                      {c.negotiation_status === 'accepted' ? (
                        <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase text-[9px]">
                          Negotiated
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded bg-slate-800 text-slate-500 border border-slate-700/20 font-bold uppercase text-[9px]">
                          Original
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-slate-900 border border-slate-800 hover:bg-slate-800/80 text-slate-300 py-3.5 px-4 rounded-xl font-medium text-sm transition-colors"
              >
                Back to Risk Board
              </button>
              <button
                onClick={handleExportContract}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/15 transition-all hover:-translate-y-0.5"
              >
                <Download className="h-4.5 w-4.5" />
                <span>Export Final Contract (.docx)</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Slide-out Negotiation Panel */}
      <NegotiationPanel
        isOpen={activeClause !== null}
        onClose={() => setActiveClause(null)}
        clause={activeClause}
        onAcceptProposal={handleAcceptProposal}
        onRejectProposal={handleRejectProposal}
        onRunNegotiation={handleRunNegotiation}
        isLoading={isNegotiating}
        proposalData={proposalData}
      />
    </div>
  );
}
