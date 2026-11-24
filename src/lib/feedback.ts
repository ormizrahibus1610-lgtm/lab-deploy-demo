import type { AppClient } from "./supabase.ts";
import type { Database } from "./database.types.ts";

export type FeedbackRow = Database["public"]["Tables"]["feedback_items"]["Row"];
export type FeedbackInsert =
  Database["public"]["Tables"]["feedback_items"]["Insert"];

export async function createFeedback(
  client: AppClient,
  input: Pick<FeedbackInsert, "user_id" | "title" | "votes">
): Promise<FeedbackRow> {
  const row: FeedbackInsert = {
    user_id: input.user_id, title: input.title, votes: input.votes ?? 0,
  };
  const { data, error } = await client.from("feedback_items").insert(row)
    .select("id, user_id, title, votes, created_at").single();
  if (error) throw error;
  return data;
}
