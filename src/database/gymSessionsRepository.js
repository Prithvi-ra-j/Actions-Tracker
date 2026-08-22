import { dbGet, dbPut, dbGetAll } from './db.js';
import { addLog } from './logsRepository.js';

export async function addGymSession(session) {
  // session: { date, exercises: [{ name, sets, reps, weight }], notes, isBenchmarkAttempt? }
  const id = crypto.randomUUID();
  const newSession = { id, ...session };
  await dbPut('gymSessions', newSession);

  // Write a gym_session log — this is what the Strength axis reads for Consistency and Volume
  await addLog({
    axis: 'strength',
    type: 'gym_session',
    value: 1,
    date: session.date,
    meta: {
      sessionId: id,
      exercises: session.exercises,
      notes: session.notes ?? '',
      isBenchmarkAttempt: session.isBenchmarkAttempt ?? false,
    }
  });

  return id;
}

export async function getGymSession(id) {
  return await dbGet('gymSessions', id);
}

export async function getAllGymSessions() {
  return await dbGetAll('gymSessions');
}
