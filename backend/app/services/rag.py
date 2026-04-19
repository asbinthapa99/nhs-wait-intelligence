"""
RAG implementation for parsing unstructured NHS PDF/Text reports.
"""
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_postgres import PGVector
from ..config import settings

def get_vector_store() -> PGVector:
    """Connects to Postgres and initializes the pgvector interface with embeddings."""
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    # Connect directly to our Neon PostgreSQL database
    return PGVector(
        embeddings=embeddings,
        collection_name="nhs_policy_docs",
        connection=settings.database_url,
        use_jsonb=True,
    )

def ingest_document(text: str, source_metadata: dict):
    """Chunks and embeds an unstructured NHS document into Postgres."""
    vector_store = get_vector_store()
    vector_store.add_texts([text], metadatas=[source_metadata])

def query_policy(question: str, top_k: int = 3):
    """Performs cosine-similarity search against unstructured text."""
    vector_store = get_vector_store()
    docs = vector_store.similarity_search(question, k=top_k)
    return [doc.page_content for doc in docs]
