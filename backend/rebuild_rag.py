import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.rag_service import rebuild_index, query
import asyncio

print("=== REBUILDING FAISS INDEX FROM ALL OFFICIAL DOCUMENTS ===")
total_chunks = rebuild_index()
print(f"DONE! Successfully indexed {total_chunks} chunks.")

async def test_retrieval():
    test_queries = [
        ("What are the hostel blocks for men and women?", "en"),
        ("What is the highest package in placements?", "en"),
        ("கல்லூரியின் சேர்க்கை கட்டணம் மற்றும் உதவித்தொகை என்ன?", "ta"),
        ("Who is the Head of Computer Science and Engineering Department?", "en"),
        ("What are the special labs for AI and Data Science?", "en"),
        ("What clubs are available in BIT campus?", "en"),
    ]
    
    output_lines = ["=== RUNNING VERIFICATION QUERIES ==="]
    for q, lang in test_queries:
        output_lines.append(f"\n--- Query ({lang}): {q} ---")
        answer, sources, route = await query(question=q, language=lang, is_verified_user=True)
        output_lines.append(f"Answer snippet: {answer}")
        output_lines.append(f"Retrieved {len(sources)} sources:")
        for s in sources[:3]:
            output_lines.append(f" - [{s.get('source')}]: {s.get('content')[:100]}...")
            
    with open("rag_verification_results.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))
    print("VERIFICATION COMPLETED! Results written to rag_verification_results.txt")

if __name__ == "__main__":
    asyncio.run(test_retrieval())

