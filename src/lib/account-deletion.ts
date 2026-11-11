/** Pure rules for shopper self-service deletion (kept separate so they can be tested). */
export const DELETE_ACCOUNT_PHRASE = "DELETE";

export function isDeleteConfirmed(input: string): boolean {
  return input.trim() === DELETE_ACCOUNT_PHRASE;
}

/** A stored try-on image belongs to a user only when it sits in their own folder. */
export function isOwnStoragePath(path: string, userId: string): boolean {
  const parts = path.split("/");
  return parts.length >= 2 && parts[0] === userId && !parts.includes("..");
}

/** Subscriptions that must be cancelled immediately when an account is deleted. */
export function shouldCancelOnDelete(status: string): boolean {
  return ["active", "trialing", "past_due", "incomplete", "unpaid", "paused"].includes(status);
}
