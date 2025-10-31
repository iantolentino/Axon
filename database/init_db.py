import sqlite3
import os

def init_database():
    conn = sqlite3.connect('second_brain.db')
    cursor = conn.cursor()
    
    with open('database/schema.sql', 'r') as f:
        schema = f.read()
    
    cursor.executescript(schema)
    conn.commit()
    conn.close()
    print("Database initialized successfully!")

if __name__ == '__main__':
    init_database()