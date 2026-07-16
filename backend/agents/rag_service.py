import logging
import os
import shutil
# pyrefly: ignore [missing-import]
from langchain_community.vectorstores import FAISS
# pyrefly: ignore [missing-import]
from langchain_text_splitters import RecursiveCharacterTextSplitter
# pyrefly: ignore [missing-import]
from langchain_huggingface import HuggingFaceEmbeddings

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAISS_STORE_DIR = os.path.join(BASE_DIR, 'faiss_indexes')
if not os.path.exists(FAISS_STORE_DIR):
    os.makedirs(FAISS_STORE_DIR)

_embeddings = None

def get_embeddings():
    """
    Lazy load HuggingFaceEmbeddings to avoid loading the model during Django initialization 
    (such as during migrations) which saves memory and prevents OOM crashes on free hosting tiers.
    """
    global _embeddings
    if _embeddings is None:
        try:
            logger.info("Loading HuggingFaceEmbeddings...")
            _embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            logger.info("HuggingFaceEmbeddings loaded successfully.")
        except Exception as e:
            logger.error("Error loading HuggingFaceEmbeddings: %s", e)
            _embeddings = None
    return _embeddings

def get_index_path(agent_id=None, team_id=None):
    if agent_id:
        return os.path.join(FAISS_STORE_DIR, str(agent_id))
    elif team_id:
        return os.path.join(FAISS_STORE_DIR, f"team_{team_id}")
    return None

def add_texts_to_knowledge_base(agent_id=None, team_id=None, raw_text="", source_name=""):
    embeddings = get_embeddings()
    if not embeddings or not raw_text.strip():
        return False
        
    try:
        splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)
        chunks = splitter.split_text(raw_text)
        
        metadatas = [{"source": source_name} for _ in chunks]
        
        index_path = get_index_path(agent_id, team_id)
        if not index_path:
            return False
            
        if os.path.exists(index_path):
            vector_store = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
            vector_store.add_texts(chunks, metadatas=metadatas)
        else:
            vector_store = FAISS.from_texts(chunks, embeddings, metadatas=metadatas)
            
        vector_store.save_local(index_path)
        return True
    except Exception as e:
        logger.error("Error adding to FAISS: %s", e)
        return False

def search_knowledge_base(agent_id=None, team_id=None, query="", top_k=4):
    embeddings = get_embeddings()
    if not embeddings:
        return ""
        
    index_path = get_index_path(agent_id, team_id)
    if not index_path or not os.path.exists(index_path):
        return ""
        
    try:
        vector_store = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
        docs = vector_store.similarity_search(query, k=top_k)
        
        if not docs:
            return ""
            
        context_parts = []
        for i, doc in enumerate(docs):
            source = doc.metadata.get("source", "Document")
            context_parts.append(f"--- Extrait pertinent {i+1} (Source: {source}) ---\n{doc.page_content}")
            
        return "\n\n".join(context_parts)
    except Exception as e:
        logger.error("Error searching FAISS: %s", e)
        return ""

def search_agent_and_team_knowledge_base(agent_id, team_id=None, query="", top_k=4):
    agent_context = search_knowledge_base(agent_id=agent_id, query=query, top_k=top_k)
    team_context = ""
    if team_id:
        team_context = search_knowledge_base(team_id=team_id, query=query, top_k=top_k)
        
    parts = []
    if agent_context.strip():
        parts.append(agent_context)
    if team_context.strip():
        parts.append(team_context)
        
    return "\n\n".join(parts)
        
def clear_agent_index(agent_id):
    index_path = get_index_path(agent_id=agent_id)
    if index_path and os.path.exists(index_path):
        shutil.rmtree(index_path)

def clear_team_index(team_id):
    index_path = get_index_path(team_id=team_id)
    if index_path and os.path.exists(index_path):
        shutil.rmtree(index_path)
