import os
import logging
import chromadb
from typing import List, Dict, Any
from rag.ingestion import get_embedding_function

logger = logging.getLogger("lexagent.rag.retriever")

def retrieve_relevant_chunks(query: str, limit: int = 3) -> List[Dict[str, Any]]:
    """
    Queries ChromaDB's 'legal_knowledge' collection for chunks similar to the query.
    Returns a list of dicts: {'text': str, 'metadata': dict, 'distance': float}
    """
    persist_dir = os.environ.get("CHROMA_PERSIST_DIR", "./chroma_db")
    
    # Check if DB directory exists
    if not os.path.exists(persist_dir):
        logger.warning(f"Chroma persist directory '{persist_dir}' does not exist. Seeding it first.")
        from rag.ingestion import seed_database
        seed_database()
        
    client = chromadb.PersistentClient(path=persist_dir)
    ef = get_embedding_function()
    
    try:
        collection = client.get_collection(name="legal_knowledge", embedding_function=ef)
    except Exception as e:
        logger.warning(f"Could not load 'legal_knowledge' collection: {e}. Attempting to seed...")
        from rag.ingestion import seed_database
        collection = seed_database()
        
    results = collection.query(
        query_texts=[query],
        n_results=limit
    )
    
    formatted_results = []
    if results and 'documents' in results and results['documents']:
        documents = results['documents'][0]
        metadatas = results['metadatas'][0] if 'metadatas' in results and results['metadatas'] else [{}] * len(documents)
        distances = results['distances'][0] if 'distances' in results and results['distances'] else [0.0] * len(documents)
        
        for doc, meta, dist in zip(documents, metadatas, distances):
            formatted_results.append({
                "text": doc,
                "metadata": meta,
                "distance": dist
            })
            
    return formatted_results
