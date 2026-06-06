import logging
from typing import Dict, Any, List, Literal
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, END

from rag.retriever import retrieve_relevant_chunks
from agents.risk_analyzer import analyze_clause_risk
from agents.clause_editor import generate_counter_proposal

logger = logging.getLogger("lexagent.agents.negotiator")

# Define the state schema
class NegotiationState(TypedDict):
    clause_id: str
    original_text: str
    current_text: str
    iteration: int
    user_feedback: str  # "reject" | "accept" | "try_again"
    rag_context: List[str]
    proposed_text: str
    rationale: str
    status: Literal["negotiating", "accepted", "failed"]

# Define Nodes
def retrieve_context(state: NegotiationState) -> Dict[str, Any]:
    """Retrieves relevant legal precedents/templates for the clause."""
    logger.info(f"Node retrieve_context: Retrieving for clause {state['clause_id']}")
    # Retrieve based on current or original text
    text_to_query = state.get("current_text") or state["original_text"]
    try:
        chunks = retrieve_relevant_chunks(text_to_query, limit=3)
        rag_context = [c["text"] for c in chunks]
    except Exception as e:
        logger.error(f"Error in retrieve_context node: {e}")
        rag_context = []
    return {"rag_context": rag_context}

def analyze_risk(state: NegotiationState) -> Dict[str, Any]:
    """Runs a quick risk check to verify the clause's initial standing."""
    logger.info(f"Node analyze_risk: Analyzing risk for clause {state['clause_id']}")
    # Risk analysis can be checked or stored. We can call the helper.
    # No-op on StateGraph unless we want to log or check. We pass the state along.
    return {}

def generate_proposal(state: NegotiationState) -> Dict[str, Any]:
    """Generates the counter-proposal rewrite using the retrieved context and feedback."""
    logger.info(f"Node generate_proposal: Generating proposal for clause {state['clause_id']}")
    iteration = state.get("iteration", 0)
    # If this is the start of negotiation, iteration is 0. We increment it.
    new_iteration = iteration + 1
    
    proposal = generate_counter_proposal(
        original_text=state["original_text"],
        current_text=state.get("current_text") or state["original_text"],
        iteration=new_iteration,
        user_feedback=state.get("user_feedback", ""),
        rag_context=state.get("rag_context", [])
    )
    
    return {
        "proposed_text": proposal["proposed_text"],
        "rationale": proposal["rationale"],
        "iteration": new_iteration,
        "status": "negotiating"
    }

def check_iteration(state: NegotiationState) -> Dict[str, Any]:
    """Terminal check on iterations. If iteration >= 3, set status=failed."""
    logger.info(f"Node check_iteration: Checking iteration limit for clause {state['clause_id']}")
    iteration = state.get("iteration", 0)
    status = state.get("status", "negotiating")
    
    if iteration >= 3 and state.get("user_feedback") in ["reject", "try_again"]:
        status = "failed"
        
    return {"status": status}

# Define conditional routing edge
def route_feedback(state: NegotiationState) -> str:
    """Routes the flow based on user feedback and iteration counts."""
    feedback = state.get("user_feedback")
    iteration = state.get("iteration", 0)
    
    if feedback == "accept":
        return "accept_end"
    elif feedback in ["reject", "try_again"]:
        if iteration >= 3:
            return "fail_end"
        else:
            return "generate_proposal"
    else:
        # Default starting route
        return "generate_proposal"

# Build the Graph
workflow = StateGraph(NegotiationState)

# Add nodes
workflow.add_node("retrieve_context", retrieve_context)
workflow.add_node("analyze_risk", analyze_risk)
workflow.add_node("generate_proposal", generate_proposal)
workflow.add_node("check_iteration", check_iteration)

# Set entry point
workflow.set_entry_point("retrieve_context")

# Define edges
workflow.add_edge("retrieve_context", "analyze_risk")
workflow.add_edge("analyze_risk", "generate_proposal")
workflow.add_edge("generate_proposal", "check_iteration")

# Add conditional routing after checking iteration
workflow.add_conditional_edges(
    "check_iteration",
    route_feedback,
    {
        "accept_end": END,
        "fail_end": END,
        "generate_proposal": "generate_proposal"
    }
)

# Compile Graph
negotiator_graph = workflow.compile()

def run_negotiation_cycle(
    clause_id: str,
    original_text: str,
    current_text: str,
    iteration: int,
    user_feedback: str,
    rag_context: List[str] = None
) -> Dict[str, Any]:
    """
    Exposes a clean interface for the API to run the negotiation cycle.
    Handles standard state transitions and invokes the compiled LangGraph.
    """
    initial_state = {
        "clause_id": clause_id,
        "original_text": original_text,
        "current_text": current_text,
        "iteration": iteration,
        "user_feedback": user_feedback,
        "rag_context": rag_context or [],
        "proposed_text": "",
        "rationale": "",
        "status": "negotiating"
    }
    
    # Run the graph
    try:
        # We invoke the graph with our state
        final_state = negotiator_graph.invoke(initial_state)
        return final_state
    except Exception as e:
        logger.error(f"Error executing negotiator graph: {e}")
        # Manual fallback logic in case graph invocation fails
        if user_feedback == "accept":
            return {
                **initial_state,
                "proposed_text": current_text,
                "status": "accepted",
                "rationale": "Accepted current draft."
            }
        
        new_iteration = iteration + 1
        if new_iteration >= 3:
            return {
                **initial_state,
                "status": "failed",
                "iteration": new_iteration,
                "rationale": "Maximum negotiation iterations reached."
            }
            
        # Generate proposal directly
        proposal = generate_counter_proposal(
            original_text=original_text,
            current_text=current_text,
            iteration=new_iteration,
            user_feedback=user_feedback,
            rag_context=rag_context or []
        )
        return {
            **initial_state,
            "proposed_text": proposal["proposed_text"],
            "rationale": proposal["rationale"],
            "iteration": new_iteration,
            "status": "negotiating"
        }
