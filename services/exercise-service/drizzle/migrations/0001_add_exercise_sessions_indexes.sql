CREATE INDEX IF NOT EXISTS exercise_sessions_user_id_idx
  ON exercise_sessions (user_id);

CREATE INDEX IF NOT EXISTS exercise_sessions_user_completed_idx
  ON exercise_sessions (user_id, completed_at);
