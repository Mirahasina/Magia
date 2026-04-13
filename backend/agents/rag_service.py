import os
import shutil
from langchain_community.vectorstores import FAISS
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAISS_STORE_DIR = os.path.join(BASE_DIR, 'faiss_indexes')
if not os.path.exists(FAISS_STORE_DIR):
    os.makedirs(FAISS_STORE_DIR)

try:
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
except Exception as e:
    print(f"Error loading HuggingFaceEmbeddings: {e}")
    embeddings = None

def get_agent_index_path(agent_id):
    return os.path.join(FAISS_STORE_DIR, str(agent_id))

def add_texts_to_knowledge_base(agent_id, raw_text, source_name=""):
    if not embeddings or not raw_text.strip():
        return False
        
    try:
        splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)
        chunks = splitter.split_text(raw_text)
        
        metadatas = [{"source": source_name} for _ in chunks]
        
        index_path = get_agent_index_path(agent_id)
        if os.path.exists(index_path):
            vector_store = FAISS.load_local(index_path, embeddings, allow_dangerous_deserialization=True)
            vector_store.add_texts(chunks, metadatas=metadatas)
        else:
            vector_store = FAISS.from_texts(chunks, embeddings, metadatas=metadatas)
            
        vector_store.save_local(index_path)
        return True
    except Exception as e:
        print(f"Error adding to FAISS: {e}")
        return False

def search_knowledge_base(agent_id, query, top_k=4):
    if not embeddings:
        return ""
        
    index_path = get_agent_index_path(agent_id)
    if not os.path.exists(index_path):
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
        print(f"Error searching FAISS: {e}")
        return ""
        
def clear_agent_index(agent_id):
    index_path = get_agent_index_path(agent_id)
    if os.path.exists(index_path):
        shutil.rmtree(index_path)
