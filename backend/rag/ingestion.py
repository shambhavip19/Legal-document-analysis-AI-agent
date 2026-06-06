import os
import logging
import chromadb
from chromadb.utils import embedding_functions

logger = logging.getLogger("lexagent.rag.ingestion")
logging.basicConfig(level=logging.INFO)

# Define 22 synthetic legal knowledge chunks
KNOWLEDGE_CHUNKS = [
    # Topic: Indemnification
    {
        "text": "Mutual Indemnification Template: Each party shall defend, indemnify, and hold harmless the other party and its officers, directors, and employees from and against any third-party claims, liabilities, damages, and costs arising out of or relating to the indemnifying party's material breach of this Agreement, gross negligence, or willful misconduct.",
        "metadata": {"type": "standard_template", "topic": "indemnification"}
    },
    {
        "text": "Unilateral Indemnification Risk: Clauses requiring only the vendor or service provider to indemnify the customer without a reciprocal obligation from the customer represent a significant risk. Vendors should seek mutual indemnification or limit their liability to direct claims rather than third-party actions.",
        "metadata": {"type": "risk_pattern", "topic": "indemnification"}
    },
    {
        "text": "Broad Indemnification Case Law: Courts generally enforce indemnity clauses strictly according to their plain language. Broad indemnification obligations that include 'any and all losses' without exclusions for the indemnified party's own negligence may be subject to legal challenges or result in severe liabilities.",
        "metadata": {"type": "case_law", "topic": "indemnification"}
    },
    # Topic: Liability Caps
    {
        "text": "Limitation of Liability Template: Except for breach of confidentiality or indemnification obligations, in no event shall either party's aggregate liability under this Agreement exceed the total fees paid or payable by Customer to Provider in the twelve (12) months preceding the event giving rise to liability.",
        "metadata": {"type": "standard_template", "topic": "liability_caps"}
    },
    {
        "text": "No Liability Cap Risk: Contracts lacking an overall cap on liability expose the provider to unlimited damages. Standard commercial practice dictates capping liability at 1x to 2x the annual contract value, with carve-outs only for gross negligence or willful misconduct.",
        "metadata": {"type": "risk_pattern", "topic": "liability_caps"}
    },
    {
        "text": "Enforceability of Liability Caps Case Law: Courts routinely uphold limitations of liability in business-to-business agreements, provided they are conspicuous, mutually agreed upon, and do not operate to fully immunize a party from its intentional wrongdoings or gross negligence.",
        "metadata": {"type": "case_law", "topic": "liability_caps"}
    },
    # Topic: IP Ownership
    {
        "text": "Intellectual Property Ownership Template: Customer retains all right, title, and interest in Customer Data. Provider retains all right, title, and interest in and to the Services, including any improvements, modifications, or derivative works thereof created during the term of this Agreement.",
        "metadata": {"type": "standard_template", "topic": "ip_ownership"}
    },
    {
        "text": "Work Made For Hire Risk: Broad 'Work Made for Hire' clauses can transfer ownership of the provider's pre-existing software, templates, or background intellectual property to the client. Providers should explicitly carve out their background IP and only grant a license to use it.",
        "metadata": {"type": "risk_pattern", "topic": "ip_ownership"}
    },
    {
        "text": "Ownership of Contractor Creations Case Law: Under copyright law, copyright ownership of works created by independent contractors remains with the contractor unless there is a written agreement signed by both parties explicitly designating it as a 'work made for hire'.",
        "metadata": {"type": "case_law", "topic": "ip_ownership"}
    },
    # Topic: Termination Rights
    {
        "text": "Termination for Cause Template: Either party may terminate this Agreement immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within thirty (30) days after receipt of written notice thereof.",
        "metadata": {"type": "standard_template", "topic": "termination_rights"}
    },
    {
        "text": "Termination for Convenience Risk: A clause allowing the client to terminate the agreement 'for convenience' with very short notice (e.g., less than 30 days) creates high revenue instability for service providers. Termination for convenience should require at least 60-90 days notice and a pro-rated refund or termination fee.",
        "metadata": {"type": "risk_pattern", "topic": "termination_rights"}
    },
    {
        "text": "Termination Convenience Bad Faith Case Law: Courts enforce termination for convenience clauses in commercial contracts as written, provided they are exercised in good faith and do not render the contract illusory due to lack of consideration.",
        "metadata": {"type": "case_law", "topic": "termination_rights"}
    },
    # Topic: Force Majeure
    {
        "text": "Force Majeure Template: Neither party shall be liable for delay or failure to perform its obligations under this Agreement due to causes beyond its reasonable control, including acts of God, war, riot, fire, pandemic, or government regulations, provided the affected party gives prompt notice.",
        "metadata": {"type": "standard_template", "topic": "force_majeure"}
    },
    {
        "text": "Force Majeure Exception for Payment Risk: Force majeure clauses should not excuse payment obligations. Customers may try to invoke force majeure to avoid paying outstanding invoices during economic downturns, which must be explicitly barred.",
        "metadata": {"type": "risk_pattern", "topic": "force_majeure"}
    },
    {
        "text": "Pandemic and Force Majeure Case Law: Following the COVID-19 pandemic, courts have scrutinised force majeure clauses closely. General economic hardship or market changes are consistently ruled insufficient to trigger force majeure performance relief.",
        "metadata": {"type": "case_law", "topic": "force_majeure"}
    },
    # Topic: Non-Compete / Non-Solicit
    {
        "text": "Non-Solicitation Template: During the term of this Agreement and for twelve (12) months thereafter, neither party shall directly or indirectly solicit for employment any employee or contractor of the other party involved in the performance of this Agreement.",
        "metadata": {"type": "standard_template", "topic": "non_compete"}
    },
    {
        "text": "Overbroad Non-Compete Clauses Risk: Restrictive covenants that prevent a contractor or software firm from working with competitor companies in similar industries are often unenforceable and represent a major operational risk. Non-competes should be narrowly tailored geographically and temporally.",
        "metadata": {"type": "risk_pattern", "topic": "non_compete"}
    },
    {
        "text": "Non-Compete Enforceability Case Law: Courts evaluate non-compete clauses based on reasonableness. In many states, like California, non-competes in employment and service contracts are void as a matter of public policy except under specific statutory exemptions.",
        "metadata": {"type": "case_law", "topic": "non_compete"}
    },
    # Topic: Payment Terms
    {
        "text": "Payment Terms Template: Customer shall pay all undisputed invoice amounts within thirty (30) days of receipt of invoice. Late payments shall bear interest at the rate of 1.5% per month or the maximum rate permitted by law, whichever is lower.",
        "metadata": {"type": "standard_template", "topic": "payment_terms"}
    },
    {
        "text": "Unreasonable Payment Milestones Risk: Payment terms exceeding 60 days (e.g. Net 90) or tied to ambiguous customer satisfaction milestones create significant cash flow risk. Standard commercial contracts should specify Net 30 terms.",
        "metadata": {"type": "risk_pattern", "topic": "payment_terms"}
    },
    # Topic: Governing Law
    {
        "text": "Governing Law and Jurisdiction Template: This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles. Any legal action arising hereunder shall be brought exclusively in the state or federal courts in Delaware.",
        "metadata": {"type": "standard_template", "topic": "governing_law"}
    },
    {
        "text": "Favorable Forum Selection Risk: Governing law in an unfamiliar or distant jurisdiction increases litigation costs significantly. It is best to choose a neutral state with well-developed commercial law, such as Delaware or New York.",
        "metadata": {"type": "risk_pattern", "topic": "governing_law"}
    }
]

def get_embedding_function():
    """Returns OpenAI embedding function if API key is present, otherwise returns Chroma's default."""
    api_key = os.environ.get("OPENAI_API_KEY")
    if api_key:
        logger.info("Using OpenAI embeddings: text-embedding-3-small")
        return embedding_functions.OpenAIEmbeddingFunction(
            api_key=api_key,
            model_name="text-embedding-3-small"
        )
    else:
        logger.warning("OPENAI_API_KEY not found. Using Chroma default embedding function (sentence-transformers).")
        # ChromaDB default embedding function
        return embedding_functions.DefaultEmbeddingFunction()

def seed_database():
    """Seeds ChromaDB with synthetic legal knowledge on startup if empty."""
    persist_dir = os.environ.get("CHROMA_PERSIST_DIR", "./chroma_db")
    os.makedirs(persist_dir, exist_ok=True)
    
    client = chromadb.PersistentClient(path=persist_dir)
    ef = get_embedding_function()
    
    collection_name = "legal_knowledge"
    
    # Check if collection exists
    try:
        collection = client.get_collection(name=collection_name, embedding_function=ef)
        # If it exists, let's see how many items
        count = collection.count()
        if count > 0:
            logger.info(f"Collection '{collection_name}' already exists with {count} chunks. Skipping seeding.")
            return collection
    except Exception:
        # Collection does not exist
        logger.info(f"Collection '{collection_name}' does not exist. Creating it.")
        collection = client.create_collection(name=collection_name, embedding_function=ef)
        
    # Seed data
    documents = [chunk["text"] for chunk in KNOWLEDGE_CHUNKS]
    metadatas = [chunk["metadata"] for chunk in KNOWLEDGE_CHUNKS]
    ids = [f"knowledge_{i}" for i in range(len(KNOWLEDGE_CHUNKS))]
    
    collection.add(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )
    logger.info(f"Successfully seeded collection '{collection_name}' with {len(documents)} chunks.")
    return collection

if __name__ == "__main__":
    # Can run this file directly to test seeding
    seed_database()
