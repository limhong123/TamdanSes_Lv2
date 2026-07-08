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
ALTER TABLE attendances
ADD COLUMN IF NOT EXISTS schedule_id INTEGER;
""")

cur.execute("""
ALTER TABLE attendances
ALTER COLUMN status TYPE VARCHAR(20);
""")

cur.execute("""
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_student_date'
    ) THEN
        ALTER TABLE attendances DROP CONSTRAINT unique_student_date;
    END IF;
END $$;
""")

cur.execute("""
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_student_schedule_date'
    ) THEN
        ALTER TABLE attendances
        ADD CONSTRAINT unique_student_schedule_date
        UNIQUE (student_id, schedule_id, date);
    END IF;
END $$;
""")

conn.commit()
cur.close()
conn.close()

print("Attendance table updated")