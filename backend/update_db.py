import psycopg2

conn = psycopg2.connect(
    dbname="TamdanSes",
    user="postgres",
    password="limhong",
    host="localhost",
    port="5432"
)

cur = conn.cursor()

# Add remark column
cur.execute("""
ALTER TABLE attendances
ADD COLUMN IF NOT EXISTS remark VARCHAR(255);
""")

conn.commit()

cur.close()
conn.close()

print("Attendance table updated successfully.")