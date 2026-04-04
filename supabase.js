import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://apmfnubljrutnnignehh.supabase.co";
const SUPABASE_KEY = "sb_publishable_zi5AnOBw_D7pl9WuhcGDug_SK0zgESg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
