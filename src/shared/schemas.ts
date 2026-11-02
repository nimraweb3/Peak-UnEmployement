import {z} from 'zod';
import {categories,eras} from './config';
export const uuid=z.string().uuid();
export const messageSchema=z.object({content:z.string().trim().min(1).max(1000).refine(s=>(s.match(/https?:\/\//gi)||[]).length<=1,'One link per message, please.'),client_id:uuid}).strict();
export const profileSchema=z.object({username:z.string().regex(/^[a-zA-Z0-9_]{3,30}$/),avatar_seed:z.string().max(40),industry_id:z.string().max(30).nullable(),profession:z.string().max(60),unemployment_status:z.enum(eras),public_status:z.string().max(120),allows_dm_requests:z.boolean(),onboarding_completed:z.boolean()}).partial().strict();
export const reportSchema=z.object({target_user:uuid,message_id:uuid.nullable().optional(),category:z.enum(categories),detail:z.string().max(500).default('')}).strict();
export const reactionSchema=z.object({emoji:z.enum(['💜','😂','🫂','🎉','🔥'])}).strict();
