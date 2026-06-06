import re
import fitz  # PyMuPDF
import docx
import difflib
from typing import List, Dict, Any, Tuple

def parse_pdf(file_path: str) -> str:
    """Extracts text from a PDF file page by page."""
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text() + "\n"
    return text

def parse_docx(file_path: str) -> str:
    """Extracts text from a DOCX file, preserving paragraph breaks."""
    doc = docx.Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs]
    return "\n".join(paragraphs)

def split_clauses(text: str) -> List[Dict[str, Any]]:
    """
    Splits contract text into sections/clauses using regex.
    Returns a list of dicts: {'id': str, 'title': str, 'text': str}
    """
    # Regex to match:
    # 1. "Section X" or "SECTION X"
    # 2. "Article X" or "ARTICLE X"
    # 3. Numbered lists like "1. ", "2.1 ", "10. ", etc. followed by capital letter
    heading_pattern = r'((?:^|\n)(?:(?:SECTION|Section|ARTICLE|Article|CLAUSE|Clause)\s+(?:\d+|[IVXLCDM\d]+)|(?:\b\d+(?:\.\d+)*\.?\s+[A-Z]))[^\n]*)'
    
    parts = re.split(heading_pattern, text)
    
    clauses = []
    
    # The first element is the preamble/introduction before the first heading
    preamble = parts[0].strip()
    if preamble:
        clauses.append({
            "id": "clause_0",
            "title": "Preamble / Introduction",
            "text": preamble
        })
        
    clause_idx = len(clauses)
    for i in range(1, len(parts), 2):
        title = parts[i].strip().replace('\n', ' ')
        body = parts[i+1].strip() if i+1 < len(parts) else ""
        
        # If the body is empty, we might have consecutive headings or it's a minor line.
        # But we still capture it.
        if title or body:
            clauses.append({
                "id": f"clause_{clause_idx}",
                "title": title if title else f"Clause {clause_idx}",
                "text": body
            })
            clause_idx += 1
            
    return clauses

def generate_text_diff(text1: str, text2: str) -> str:
    """Generates a line-by-line diff between two texts."""
    lines1 = text1.splitlines()
    lines2 = text2.splitlines()
    diff = difflib.unified_diff(lines1, lines2, lineterm="")
    return "\n".join(list(diff))

def compare_documents(clauses1: List[Dict[str, Any]], clauses2: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Compares two lists of clauses, matching them by title or index.
    Returns a list of compared clauses with diff status and details.
    """
    compared = []
    
    # Create a map of title -> clause for Doc 2 to match
    doc2_map = {}
    for c in clauses2:
        clean_title = re.sub(r'\s+', '', c["title"].lower())
        doc2_map[clean_title] = c

    for idx, c1 in enumerate(clauses1):
        clean_title = re.sub(r'\s+', '', c1["title"].lower())
        
        # Try matching by title first, then by index if reasonable
        matched_clause = None
        if clean_title in doc2_map:
            matched_clause = doc2_map[clean_title]
        elif idx < len(clauses2):
            # Fallback check if titles are highly similar
            c2_candidate = clauses2[idx]
            ratio = difflib.SequenceMatcher(None, c1["title"], c2_candidate["title"]).ratio()
            if ratio > 0.6:
                matched_clause = c2_candidate

        if matched_clause:
            text1 = c1["text"]
            text2 = matched_clause["text"]
            is_different = text1.strip() != text2.strip()
            
            diff_text = ""
            if is_different:
                diff_text = generate_text_diff(text1, text2)
                
            compared.append({
                "id": c1["id"],
                "title": c1["title"],
                "original_text": text1,
                "counterparty_text": text2,
                "has_diff": is_different,
                "diff": diff_text
            })
        else:
            # Clause exists only in Doc 1
            compared.append({
                "id": c1["id"],
                "title": c1["title"],
                "original_text": c1["text"],
                "counterparty_text": "",
                "has_diff": True,
                "diff": f"- {c1['text']}"
            })
            
    # Check if there are clauses in Doc 2 that weren't in Doc 1
    doc1_titles = {re.sub(r'\s+', '', c["title"].lower()) for c in clauses1}
    for idx, c2 in enumerate(clauses2):
        clean_title = re.sub(r'\s+', '', c2["title"].lower())
        if clean_title not in doc1_titles:
            compared.append({
                "id": f"clause_extra_{idx}",
                "title": c2["title"],
                "original_text": "",
                "counterparty_text": c2["text"],
                "has_diff": True,
                "diff": f"+ {c2['text']}"
            })
            
    return compared
