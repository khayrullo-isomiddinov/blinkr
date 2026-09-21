import os
from contextlib import contextmanager

import psycopg2
import psycopg2.extras


def get_connection():
  connection_url = os.getenv('DATABASE_URL') or os.getenv('CONNECTION_URL')
  return psycopg2.connect(connection_url)


@contextmanager
def transaction():
  """
  Application/use-case level transaction boundary: yields one connection
  for the caller to run multiple statements against as a single atomic
  unit via execute()/query_array_json()'s `conn` argument. Commits once the
  block completes without raising; rolls back (and re-raises) otherwise.

  Repository functions keep working exactly as before when called without
  `conn` (their own connection, auto-committed) -- this only changes
  behavior for call sites that explicitly opt in by passing the connection
  this yields.
  """
  conn = get_connection()
  try:
    yield conn
    conn.commit()
  except Exception:
    conn.rollback()
    raise
  finally:
    conn.close()


def query_array_json(sql, params=None, conn=None):
  if conn is not None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
      cur.execute(sql, params or ())
      rows = cur.fetchall()
      return [dict(row) for row in rows]

  with get_connection() as conn:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
      cur.execute(sql, params or ())
      rows = cur.fetchall()
      return [dict(row) for row in rows]


def execute(sql, params=None, conn=None):
  if conn is not None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
      cur.execute(sql, params or ())
      if cur.description:
        row = cur.fetchone()
        return dict(row) if row else None
      return None

  with get_connection() as conn:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
      cur.execute(sql, params or ())
      if cur.description:
        row = cur.fetchone()
        conn.commit()
        return dict(row) if row else None
      conn.commit()
      return None
