// Supabase Edge Function: send-notification
// Reads SendGrid API key from notification_settings table (admin-configured)
// and sends a transactional email via SendGrid.
// Deploy: supabase functions deploy send-notification

import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface EmailPayload {
  to: string
  subject: string
  html: string
  alertType: string
}

function buildEmailHtml(subject: string, body: string, alertType: string): string {
  const iconMap: Record<string, string> = {
    attendance_reminder: "⏰",
    attendance_summary: "📊",
    late_arrival: "⚠️",
    high_absenteeism: "📉",
    leave_approval: "📋",
  }
  const accent: Record<string, string> = {
    attendance_reminder: "#f59e0b",
    late_arrival: "#ef4444",
    high_absenteeism: "#ef4444",
    attendance_summary: "#3b82f6",
    leave_approval: "#8b5cf6",
  }
  const icon    = iconMap[alertType]    ?? "📬"
  const color   = accent[alertType]     ?? "#3b82f6"

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; background: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    .wrap { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.07); }
    .header { background: #111827; padding: 28px 32px; display: flex; align-items: center; gap: 14px; }
    .header-icon { font-size: 28px; }
    .header-title { color: #ffffff; font-size: 18px; font-weight: 700; margin: 0; }
    .accent-bar { height: 4px; background: ${color}; }
    .body { padding: 28px 32px; }
    .alert-box { border-left: 4px solid ${color}; background: #f8fafc; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 20px; }
    .alert-box p { margin: 0; color: #374151; font-size: 15px; line-height: 1.6; }
    .cta { display: inline-block; padding: 12px 24px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 8px; }
    .footer { background: #f9fafb; padding: 16px 32px; text-align: center; }
    .footer p { margin: 0; font-size: 12px; color: #9ca3af; }
    .footer a { color: #6b7280; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="header-icon">${icon}</div>
      <p class="header-title">${subject}</p>
    </div>
    <div class="accent-bar"></div>
    <div class="body">
      <div class="alert-box"><p>${body}</p></div>
      <a href="${Deno.env.get("SITE_URL") ?? "https://scrumanalytics.app"}/mark" class="cta">Open Dashboard →</a>
    </div>
    <div class="footer">
      <p>Scrum Discipline Analytics &nbsp;·&nbsp; <a href="${Deno.env.get("SITE_URL") ?? "https://scrumanalytics.app"}/settings?tab=notifications">Manage Notifications</a></p>
    </div>
  </div>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const payload: EmailPayload = await req.json()
    const { to, subject, alertType } = payload

    // Read SendGrid config from admin-configured settings
    const { data: cfg } = await supabaseAdmin
      .from("notification_settings")
      .select("sendgrid_api_key, sendgrid_from_email")
      .eq("config_key", "global")
      .maybeSingle()

    const apiKey   = cfg?.sendgrid_api_key
    const fromEmail = cfg?.sendgrid_from_email || "notifications@scrumanalytics.app"

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "SendGrid API key not configured. Go to System Settings → Notifications to set it." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Build or use provided HTML
    const htmlBody = payload.html || buildEmailHtml(subject, "You have a new notification.", alertType)

    const sgRes = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: "Scrum Analytics" },
        subject,
        content: [{ type: "text/html", value: htmlBody }],
      }),
    })

    if (!sgRes.ok) {
      const errText = await sgRes.text()
      throw new Error(`SendGrid responded ${sgRes.status}: ${errText}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("send-notification error:", message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
