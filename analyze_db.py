import sqlite3
import os

DB_PATH = 'letterboxd_imdb.db'

def analyze():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print(f"File size: {os.path.getsize(DB_PATH) / (1024*1024):.2f} MB")
    
    # 1. Movie counts by decade
    print("\nMovies by Decade:")
    cursor.execute("""
        SELECT (cast(startYear as int)/10)*10 as decade, count(*) 
        FROM movie_metadata 
        GROUP BY decade 
        ORDER BY decade DESC
        LIMIT 15
    """)
    for row in cursor.fetchall():
        print(f"  {row[0]}s: {row[1]:,}")
        
    # 2. Check for "Adult" movies - wait, we didn't store isAdult. 
    # But usually Letterboxd wrapped doesn't need them.
    
    # 3. Names table analysis
    cursor.execute("SELECT count(*) FROM names")
    total_names = cursor.fetchone()[0]
    print(f"\nTotal names: {total_names:,}")
    
    # How many names are actually referenced?
    print("Checking referenced names...")
    cursor.execute("SELECT directors, actors FROM movie_metadata")
    referenced_nconsts = set()
    for row in cursor.fetchall():
        if row[0]:
            referenced_nconsts.update(row[0].split(','))
        if row[1]:
            referenced_nconsts.update(row[1].split(','))
            
    cursor.execute("SELECT nconst FROM names")
    existing_nconsts = set(row[0] for row in cursor.fetchall())
    
    orphan_names = existing_nconsts - referenced_nconsts
    print(f"Orphan names (not in any movie): {len(orphan_names):,}")
    
    # 4. Storage impact of index
    cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='index'")
    print("\nIndexes:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]}")

    conn.close()

if __name__ == "__main__":
    analyze()
