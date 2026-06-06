import os
import json
import logging
from typing import Dict, Any, List
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from rag.retriever import retrieve_relevant_chunks

logger = logging.getLogger("lexagent.agents.risk_analyzer")

RISK_ANALYSIS_SYSTEM_PROMPT = """You are an expert legal AI risk analyzer. Your job is to review a contract clause, analyze its risk level based on the provided legal knowledge context, and output a structured JSON response.

Context (similar standard clauses, case law, and risk patterns):
{context}

Clause to analyze:
"{clause_text}"

Analyze the clause carefully. You MUST output a JSON object with the exact keys:
1. "risk_level": Must be "LOW", "MEDIUM", or "HIGH".
2. "explanation": Exactly 2 sentences in plain English, explaining why it is risky or what the implications are.
3. "favors": Must be "user", "counterparty", or "neutral".

Ensure the response contains ONLY the valid JSON object. Do not include markdown code block formatting (like ```json ... ```) or any other text outside the JSON.
"""

def analyze_clause_risk(clause_text: str) -> Dict[str, Any]:
    # 1. Retrieve RAG context
    try:
        rag_results = retrieve_relevant_chunks(clause_text, limit=3)
        context_str = "\n\n".join([f"[{i+1}] {r['text']}" for i, r in enumerate(rag_results)])
    except Exception as e:
        logger.error(f"Error retrieving RAG context: {e}")
        context_str = "No legal knowledge context available."
        rag_results = []
        
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        logger.warning("GROQ_API_KEY not found. Returning mock risk analysis.")
        return get_mock_risk_analysis(clause_text, rag_results)

    try:
        # Using Llama 3.1 70b on Groq
        llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.0, groq_api_key=api_key)
        
        prompt = ChatPromptTemplate.from_template(RISK_ANALYSIS_SYSTEM_PROMPT)
        chain = prompt | llm
        
        response = chain.invoke({
            "context": context_str,
            "clause_text": clause_text
        })
        
        content = response.content.strip()
        if content.startswith("```"):
            lines = content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            content = "\n".join(lines).strip()
            
        result = json.loads(content)
        result["rag_context"] = [r["text"] for r in rag_results]
        return result
        
    except Exception as e:
        logger.error(f"Error in LLM risk analysis: {e}")
        return {
            "risk_level": "MEDIUM",
            "explanation": f"Failed to run LLM risk analysis. Error: {str(e)}",
            "favors": "neutral",
            "rag_context": [r["text"] for r in rag_results]
        }

def get_mock_risk_analysis(clause_text: str, rag_results: List[Dict[str, Any]]) -> Dict[str, Any]:
    text_lower = clause_text.lower()
    rag_texts = [r["text"] for r in rag_results]
    
    if "indemnity" in text_lower or "indemnify" in text_lower:
        return {
            "risk_level": "HIGH",
            "explanation": "This clause imposes broad indemnification obligations on the party. Unilateral indemnification requirements expose you to significant liabilities.",
            "favors": "counterparty",
            "rag_context": rag_texts
        }
    elif "limitation of liability" in text_lower or "liability cap" in text_lower or "cap" in text_lower:
        return {
            "risk_level": "MEDIUM",
            "explanation": "The limitation of liability is set at a low threshold. Standard B2B contracts should balance liability caps at 1x or 2x the annual contract value.",
            "favors": "counterparty",
            "rag_context": rag_texts
        }
    else:
        return {
            "risk_level": "LOW",
            "explanation": "This clause governs standard operations and does not contain major deviations. The risk is minimal.",
            "favors": "neutral",
            "rag_context": rag_texts
        }