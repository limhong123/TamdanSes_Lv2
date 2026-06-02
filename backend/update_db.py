import psycopg2

conn = psycopg2.connect(
    dbname="TamdanSes",
    user="postgres",
    password="limhong",
    host="localhost",
    port="5432"
)

cur = conn.cursor()


def add_column(table, column, column_type):
    try:
        cur.execute(
            f"ALTER TABLE {table} ADD COLUMN {column} {column_type}"
        )

        conn.commit()

        print(f"Added {table}.{column}")

    except Exception as e:
        conn.rollback()

        print(f"Skipped {table}.{column}: {e}")


# homework_submissions
add_column(
    "homework_submissions",
    "bonus",
    "FLOAT DEFAULT 0"
)

add_column(
    "homework_submissions",
    "score",
    "FLOAT"
)

add_column(
    "homework_submissions",
    "teacher_comment",
    "TEXT"
)

add_column(
    "homework_submissions",
    "submitted_at",
    "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
)

# homework
add_column(
    "homework",
    "created_at",
    "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
)

add_column(
    "homework",
    "file_path",
    "VARCHAR(255)"
)

cur.close()
conn.close()

print("Database updated successfully")