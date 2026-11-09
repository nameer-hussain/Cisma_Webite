// supabase/functions/send-status-email/index.ts
// Sends the author an email when their submission status changes.
// Called by the admin page (status change) and by /submissions (withdraw).
// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ASSUMPTION: adjust to your real status values / wording
const MESSAGES: Record<string, { subject: string; headline: string; body: string; decision?: boolean }> = {
  under_review: {
    subject: "Your abstract is now under review",
    headline: "Under review",
    body: "Your abstract is now being reviewed by the programme committee. We will contact you once a decision has been made.",
  },
  accepted_oral: {
    subject: "Your abstract has been accepted (oral presentation)",
    headline: "Accepted: oral presentation",
    body: "Congratulations! Your abstract has been accepted for an oral presentation at the 3rd CISMA International Conference.",
    decision: true,
  },
  accepted_poster: {
    subject: "Your abstract has been accepted (poster presentation)",
    headline: "Accepted: poster presentation",
    body: "Congratulations! Your abstract has been accepted for a poster presentation at the 3rd CISMA International Conference.",
    decision: true,
  },
  rejected: {
    subject: "Your abstract has not been accepted",
    headline: "Not accepted",
    body: "Thank you for your submission. Unfortunately, your abstract has not been accepted for this edition of the conference.",
    decision: true,
  },
  withdrawn: {
    subject: "Your abstract has been withdrawn",
    headline: "Withdrawn",
    body: "Your abstract has been withdrawn as requested. If this was a mistake, please contact the conference team.",
  },
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (o: unknown, status = 200) =>
    new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const brevo = Deno.env.get("BREVO_API_KEY")!;
    const fromEmail = Deno.env.get("FROM_EMAIL") ?? "noreply@cisma-corpus.com";
    const fromName = Deno.env.get("FROM_NAME") ?? "CISMA 2027";
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://cisma-corpus.com";
    const decisionsOn = Deno.env.get("DECISION_EMAILS") === "on"; // keep OFF until 28 Feb 2027

    // 1. who is calling?
    const caller = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "not logged in" }, 401);

    const { submission_id } = await req.json();
    const admin = createClient(url, svc);

    // 2. load submission (service role, because the caller may be an admin)
    const { data: sub, error: e1 } = await admin
      .from("submissions").select("id, ref_no, title, status, submitter_id").eq("id", submission_id).single();
    if (e1 || !sub) return json({ error: "submission not found" }, 404);

    // 3. permission: admin, or the owner reporting their own withdrawal
    const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).single();
    const isAdmin = prof?.role === "admin";
    const isOwnerWithdraw = sub.submitter_id === user.id && sub.status === "withdrawn";
    if (!isAdmin && !isOwnerWithdraw) return json({ error: "forbidden" }, 403);

    const msg = MESSAGES[sub.status];
    if (!msg) return json({ skipped: "no email for status " + sub.status });

    // 4. do not leak decisions before release
    if (msg.decision && !decisionsOn) {
      await admin.from("submission_status_emails").insert({ submission_id: sub.id, sub_status: sub.status, status: "skipped", error: "decision emails are off" });
      return json({ skipped: "decision emails are off" });
    }

    // 5. do not send the same status email twice in a row
    const { data: last } = await admin.from("submission_status_emails").select("sub_status, status")
      .eq("submission_id", sub.id).eq("status", "sent")
      .order("created_at", { ascending: false }).limit(1);
    if (last?.[0]?.sub_status === sub.status) return json({ skipped: "already sent" });

    // 6. recipient = the author's login email
    const { data: au } = await admin.auth.admin.getUserById(sub.submitter_id);
    const to = au?.user?.email;
    if (!to) return json({ error: "author email not found" }, 404);

    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e3e6ee;border-radius:8px;overflow:hidden">
      <div style="background:#0b1f4b;color:#fff;padding:18px 24px;font-size:18px">CISMA International Conference 2027</div>
      <div style="padding:24px;color:#1b2333;line-height:1.55">
        <h2 style="margin:0 0 12px">${esc(msg.headline)}</h2>
        <p>${esc(msg.body)}</p>
        <div style="background:#f4f6fb;border-radius:6px;padding:12px 16px;margin:16px 0">
          <div><b>Reference:</b> ${esc(String(sub.ref_no ?? ""))}</div>
          <div><b>Title:</b> ${esc(String(sub.title ?? ""))}</div>
        </div>
        <p><a href="${siteUrl}/submissions" style="background:#0b1f4b;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">View my submissions</a></p>
        <p style="color:#6b7385;font-size:13px">CISMA Conference Team</p>
      </div></div>`;

    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": brevo, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender: { email: fromEmail, name: fromName }, to: [{ email: to }], subject: msg.subject, htmlContent: html }),
    });
    const ok = r.ok;
    await admin.from("submission_status_emails").insert({
      submission_id: sub.id, to_email: to, sub_status: sub.status,
      status: ok ? "sent" : "failed", error: ok ? null : (await r.text()).slice(0, 500),
    });
    return json({ ok });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});