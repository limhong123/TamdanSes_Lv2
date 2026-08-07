import psycopg2


conn = psycopg2.connect(
    dbname="TamdanSes",
    user="postgres",
    password="limhong",
    host="localhost",
    port="5432"
)

cur = conn.cursor()


# Add score_type
cur.execute("""
ALTER TABLE scores
ADD COLUMN IF NOT EXISTS score_type VARCHAR(30)
DEFAULT 'monthly';
""")


# Old records are monthly
cur.execute("""
UPDATE scores
SET score_type = 'monthly'
WHERE score_type IS NULL;
""")


# Semester exam has no month
cur.execute("""
ALTER TABLE scores
ALTER COLUMN month DROP NOT NULL;
""")


# Monthly score:
# one score / student / subject / semester / month
cur.execute("""
CREATE UNIQUE INDEX IF NOT EXISTS
unique_monthly_score
ON scores (
    student_id,
    class_id,
    subject_id,
    semester,
    month
)
WHERE score_type = 'monthly';
""")


# Semester exam:
# one exam / student / subject / semester
cur.execute("""
CREATE UNIQUE INDEX IF NOT EXISTS
unique_semester_exam_score
ON scores (
    student_id,
    class_id,
    subject_id,
    semester
)
WHERE score_type = 'semester_exam';
""")


conn.commit()
cur.close()
conn.close()

print("Score database updated successfully")