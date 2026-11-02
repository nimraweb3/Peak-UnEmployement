export interface Profile {id:string;username:string;avatar_seed:string;industry_id:string|null;profession:string;unemployment_status:string;public_status:string;allows_dm_requests:boolean;onboarding_completed:boolean;created_at:string}
export interface Room {id:string;slug:string;name:string;description:string;icon:string;industry_id:string|null}
export interface Message {id:string;room_id:string|null;conversation_id:string|null;sender_id:string;content:string;created_at:string;deleted_at:string|null;client_id:string;profiles:Pick<Profile,'id'|'username'|'avatar_seed'|'allows_dm_requests'>;reactions:{user_id:string;emoji:string}[]}
export interface Request {id:string;sender_id:string;recipient_id:string;status:string;created_at:string;sender:Profile;recipient:Profile}
export interface Conversation {id:string;user_a:string;user_b:string;closed_at:string|null;created_at:string;a:Profile;b:Profile;unread:number}
