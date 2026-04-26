"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { api } from "./_generated/api";

const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_123") return null;
  try {
    return new Resend(apiKey);
  } catch (err) {
    console.error("Resend init error:", err);
    return null;
  }
};

export const mailAll = action({
  args: {
    subject: v.string(),
    message: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    sentCount: v.number(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ success: boolean; sentCount: number; error?: string }> => {
    const resend = getResend();
    if (!resend) {
      return { success: false, sentCount: 0, error: "RESEND_API_KEY not set in environment variables." };
    }

    // Get all users with emails
    const users = await ctx.runQuery(api.users.listWithEmails);
    
    if (users.length === 0) {
      return { success: true, sentCount: 0 };
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const user of (users as any[])) {
      if (!user.email) continue;

      try {
        const { error } = await resend.emails.send({
          from: "Better Quality <onboarding@resend.dev>", 
          to: [user.email],
          subject: args.subject,
          text: args.message,
        });

        if (error) {
          console.error(`Failed to send to ${user.email}:`, error);
          // @ts-ignore
          const resendError = error?.message || "Unknown Error";
          errors.push(`${user.email} (${resendError})`);
        } else {
          sentCount++;
        }
        
        // Wait 250ms between emails to avoid Resend rate limits (5/sec)
        await new Promise(resolve => setTimeout(resolve, 250));
      } catch (err: any) {
        console.error(`Error sending to ${user.email}:`, err);
        errors.push(`${user.email} (Exception)`);
      }
    }

    return { 
      success: errors.length === 0, 
      sentCount, 
      error: errors.length > 0 ? `Failed: ${errors.slice(0, 3).join(", ")}${errors.length > 3 ? "..." : ""}` : undefined 
    };
  },
});
