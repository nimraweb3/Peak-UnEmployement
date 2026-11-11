import {supabase} from "./api";
export function profileMediaUrl(path?:string|null){return path&&supabase?supabase.storage.from("profile-media").getPublicUrl(path).data.publicUrl:undefined;}
