import { z } from 'zod';

const isoTimestamp = z.string().refine(value => !Number.isNaN(Date.parse(value)), {
  message: 'Expected a valid ISO timestamp',
});

export const NutriLiftRecordSchema = z.object({
  external_id: z.string().min(1),
  record_type: z.enum([
    'body.training.session',
    'body.performance',
    'body.progression',
    'body.measurement',
    'body.recovery.sleep',
    'body.recovery.hrv',
    'body.recovery.energy',
    'body.recovery.soreness',
    'body.recovery.stress',
    'body.nutrition.adherence',
  ]),
  occurred_at: isoTimestamp,
  source_updated_at: isoTimestamp.nullable().optional(),
  updated_at: isoTimestamp.optional(),
  payload: z.record(z.unknown()),
  schema_version: z.number().int().positive(),
  deleted_at: isoTimestamp.nullable().optional(),
});

export function validateNutriLiftRecord(record) {
  return NutriLiftRecordSchema.parse(record);
}
