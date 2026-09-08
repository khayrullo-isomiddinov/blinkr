import os
import psycopg2
import psycopg2.extras


def get_connection():
  connection_url = os.getenv('DATABASE_URL') or os.getenv('CONNECTION_URL')
  return psycopg2.connect(connection_url)


def query_array_json(sql, params=None):
  with get_connection() as conn:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
      cur.execute(sql, params or ())
      rows = cur.fetchall()
      return [dict(row) for row in rows]


def execute(sql, params=None):
  with get_connection() as conn:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
      cur.execute(sql, params or ())
      if cur.description:
        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None
      conn.commit()
      return None
