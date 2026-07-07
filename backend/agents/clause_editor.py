import os
import json
import logging
from typing import Dict, Any, List
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

logger = logging.getLogger("lexagent.agents.clause_editor")

CLAUSE_EDITOR_SYSTEM_PROMPT = """You are a master legal contract negotiator and advisor. Your objective is to rewrite a contract clause to protect the user's interests while keeping the proposal balanced and realistic enough for the counterparty to accept.

Original Clause Text:
"{original_text}"

Current Clause Text:
"{current_text}"

RAG Legal Context (Standard Templates & Precedents):
{context}

Iteration: {iteration}
User Feedback (why it was rejected or what changes they want):
"{user_feedback}"

Generate a counter-proposal. You MUST output a JSON object with the exact keys:
1. "proposed_text": The complete updated text of the clause. Make sure it is fully written out.
2. "rationale": A plain-English explanation of why these changes protect the user.

Ensure the response contains ONLY the valid JSON object. Do not include markdown code block formatting (like ```json ... ```) or any other text outside the JSON.
"""

def generate_counter_proposal(
    original_text: str,
    current_text: str,
    iteration: int,
    user_feedback: str,
    rag_context: List[str]
) -> Dict[str, Any]:
    context_str = "\n\n".join([f"[{i+1}] {text}" for i, text in enumerate(rag_context)])
    
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        logger.warning("GROQ_API_KEY not found. Returning mock proposal.")
        return get_mock_proposal(original_text, iteration, user_feedback)
        
    try:
        # Using Llama 3.1 70b on Groq
        llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0.3, groq_api_key=api_key)
        
        prompt = ChatPromptTemplate.from_template(CLAUSE_EDITOR_SYSTEM_PROMPT)
        chain = prompt | llm
        
        response = chain.invoke({
            "original_text": original_text,
            "current_text": current_text,
            "context": context_str,
            "iteration": iteration,
            "user_feedback": user_feedback or "Generate a more balanced version favoring the user."
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
        return result
        
    except Exception as e:
        logger.error(f"Error in LLM clause editor: {e}")
        return {
            "proposed_text": current_text,
            "rationale": f"Failed to generate proposal due to LLM error: {str(e)}."
        }

def get_mock_proposal(original_text: str, iteration: int, user_feedback: str) -> Dict[str, Any]:
    original_lower = original_text.lower()
    feedback_append = f" (Adjusted based on: '{user_feedback}')" if user_feedback else ""
    
    if "indemnity" in original_lower or "indemnify" in original_lower:
        proposed_text = "Mutual Indemnification: Each party shall defend, indemnify, and hold harmless the other party from and against third-party claims arising out of material breach or gross negligence."
        rationale = f"Replaced the unilateral indemnification clause with a mutual one.{feedback_append}"
    else:
        proposed_text = f"Counter-Proposal (v{iteration}): {original_text} (Optimized for mutual fairness.{feedback_append})"
        rationale = f"Rewrote the clause to balance rights (iteration {iteration})."
        
    return {
        "proposed_text": proposed_text,
        "rationale": rationale
    }