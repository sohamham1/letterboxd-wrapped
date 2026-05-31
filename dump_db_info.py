import sqlite3

def dump_db_info():
    conn = sqlite3.connect('letterboxd_imdb.db')
    c = conn.cursor()
    
    tables = ['movie_metadata', 'names']
    
    for table in tables:
        print(f"=== Table: {table} ===")
        # Get Schema
        c.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name=?;", (table,))
        schema = c.fetchone()
        if schema:
            print(f"Schema:\n{schema[0]}")
        
        # Get 5 Sample Rows
        print(f"\nSample Data (5 rows):")
        c.execute(f"SELECT * FROM {table} LIMIT 5;")
        col_names = [description[0] for description in c.description]
        print(f"Columns: {col_names}")
        for row in c.fetchall():
            print(row)
        print("-" * 40)
        
    conn.close()

if __name__ == "__main__":
    dump_db_info()
