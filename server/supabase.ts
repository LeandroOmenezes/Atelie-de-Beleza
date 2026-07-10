import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET || "public";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in environment variables.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
  },
});

export async function uploadFileToSupabase(path: string, fileBuffer: Buffer, contentType: string) {
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(path, fileBuffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw error;
  }

  const publicData = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(path).data;
  if (!publicData?.publicUrl) {
    throw new Error("Failed to get public URL from Supabase storage");
  }

  return publicData.publicUrl;
}

export async function deleteFileFromSupabase(path: string) {
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).remove([path]);
  if (error) {
    throw error;
  }
  return true;
}
