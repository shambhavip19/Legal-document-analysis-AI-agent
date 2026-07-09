#AI Legal Document Negotiator

An agentic, full-stack AI web application designed to accelerate contract review and automate negotiation cycles. By integrating a multi-agent backend orchestrator with a highly responsive, modern frontend, LexAgent enables legal professionals, vendors, and developers to analyze contract risk profiles, retrieve relevant legal precedents, and engage in an interactive counter-proposal revision process.

The backend is built with Python, FastAPI, and LangGraph, utilizing ChromaDB as a local vector database to house a seeded library of standard commercial templates, case law references, and risk patterns. The frontend features a dark-theme glassmorphism design created in React + Vite and Tailwind CSS, featuring file upload zones, automated comparison views, inline diff calculations using `react-diff-viewer`, and a console terminal showing the AI agent's strategy rationale.


---

## Technical Stack

- **Backend:** Python 3.11+, FastAPI, LangGraph, LangChain, ChromaDB, PyMuPDF (fitz), python-docx, OpenAI API (GPT-4o), Uvicorn.
- **Frontend:** React 18, Vite, Tailwind CSS v3, Axios, react-dropzone, react-diff-viewer, lucide-react.

---

## Example Walkthrough

### Step 1: Upload Documents
Drag and drop contract files. You can upload:
- **1 Document**: Agent parses and analyzes its clause risks.
- **2 Documents**: Agent automatically diffs them. This is ideal when comparing a client-provided mark-up against your original template.
- *Test files `sample_contract_original.docx` and `sample_contract_counterparty.docx` are provided in the root folder for immediate evaluation.*

### Step 2: Risk Scoring
The analyzer parses files into clauses using regex headers. It runs a RAG retrieval against ChromaDB for standard templates and liability cases, categorizes each clause as **LOW**, **MEDIUM**, or **HIGH** risk, highlights the party favored, and outputs a 2-sentence explanation.

### Step 3: Interactive Agentic Negotiation
Click **Negotiate Clause** to open the side drawer:
1. Under the hood, a LangGraph loop retrieves context and proposes counter-wording (e.g. converting a unilateral indemnity into a mutual one).
2. The UI highlights deletions and additions side-by-side using `react-diff-viewer`.
3. Provide custom text feedback (e.g., "Change the cure period to 15 days") and click **Try Again** (up to 3 iterations allowed).
4. Click **Accept Proposed Version** to update your contract state.

### Step 4: Export Contract
Navigate to the Export screen for a summary overview of edits. Click **Export Final Contract** to download a clean, structured MS Word (`.docx`) file with all negotiated improvements compiled automatically.

---

