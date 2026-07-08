import psycopg2

conn = psycopg2.connect(
    dbname="TamdanSes",
    user="postgres",
    password="limhong",
    host="db",
    port="5432"
)

cur = conn.cursor()

cur.execute("""
ALTER TABLE homework_submissions
ADD COLUMN IF NOT EXISTS file_paths TEXT;
""")

conn.commit()
cur.close()
conn.close()

print("Homework submissions table updated")