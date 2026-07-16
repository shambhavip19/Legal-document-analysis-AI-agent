import axios from 'axios';

const API_BASE_URL = 'https://legal-document-analysis-ai-agent-production.up.railway.app';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  /**
   * Check health of the backend API.
   */
  checkHealth: async () => {
    const response = await client.get('/api/health');
    return response.data;
  },

  /**
   * Upload 1 or 2 documents to parse.
   * @param {File[]} files
   */
  uploadDocuments: async (files) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await client.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Run risk analysis on the parsed clauses.
   * @param {Object[]} clauses
   */
  analyzeClauses: async (clauses) => {
    const response = await client.post('/api/analyze', { clauses });
    return response.data;
  },

  /**
   * Send a clause to the negotiator agent loop.
   * @param {string} clauseId
   * @param {string} clauseText
   * @param {number} iteration
   * @param {string} userFeedback
   * @param {string} originalText
   */
  negotiateClause: async (clauseId, clauseText, iteration, userFeedback, originalText) => {
    const response = await client.post('/api/negotiate', {
      clause_id: clauseId,
      clause_text: clauseText,
      original_text: originalText || clauseText,
      iteration,
      user_feedback: userFeedback,
    });
    return response.data;
  },

  /**
   * Exports the negotiated contract clauses as a DOCX download.
   * @param {Object[]} clauses
   */
  exportContract: async (clauses) => {
    const response = await client.post('/api/export', { clauses }, {
      responseType: 'blob', // Important for downloading files
    });
    
    // Create a blob URL and trigger the browser download
    const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'LexAgent_Final_Contract.docx');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return true;
  },
};

export default api;
