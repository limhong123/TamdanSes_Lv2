import psycopg2

conn = psycopg2.connect(
    dbname="TamdanSes",
    user="postgres",
    password="limhong",
    host="localhost",
    port="5432"
)

cur = conn.cursor()

# Add fcm_token column to users table
cur.execute("""
ALTER TABLE users
ADD COLUMN IF NOT EXISTS fcm_token TEXT;
""")

# Add created_at column to notifications table
cur.execute("""
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
""")

conn.commit()

cur.close()
conn.close()

print("Database updated successfully")