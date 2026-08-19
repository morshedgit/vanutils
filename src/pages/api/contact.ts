import type { APIRoute } from 'astro';

// In-memory edge rate limiting map (IP -> Array of submission timestamps)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 3;

interface ContactRequestBody {
  name?: string;
  email?: string;
  category?: string;
  message?: string;
  _gotcha?: string; // Honeypot field
}

const VALID_CATEGORIES: Record<string, { label: string; emoji: string }> = {
  data_correction: { label: 'Data Discrepancy / Correction', emoji: '🚨' },
  feature_request: { label: 'New Micro-Utility Suggestion', emoji: '💡' },
  agency_inquiry: { label: 'Municipal / Health Agency Inquiry', emoji: '🏛️' },
  bug_report: { label: 'Technical Bug Report', emoji: '🐞' },
  general: { label: 'General Inquiry', emoji: '💬' },
};

function generateReferenceId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
  const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `VH-${dateStr}-${randomHex}`;
}

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(clientIp) || []).filter(
    (time) => now - time < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  timestamps.push(now);
  rateLimitMap.set(clientIp, timestamps);

  // Periodic cleanup of stale rate limit entries
  if (rateLimitMap.size > 1000) {
    for (const [ip, list] of rateLimitMap.entries()) {
      const active = list.filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
      if (active.length === 0) {
        rateLimitMap.delete(ip);
      } else {
        rateLimitMap.set(ip, active);
      }
    }
  }

  return true;
}

export const POST: APIRoute = async ({ request, clientAddress, locals }) => {
  try {
    const runtimeEnv = (locals as any)?.runtime?.env || {};
    const getEnv = (key: string) => runtimeEnv[key] || process.env[key];
    // 1. Identify Client IP
    const clientIp =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      clientAddress ||
      'unknown-ip';

    // 2. Enforce Edge Rate Limiting
    if (!checkRateLimit(clientIp)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Rate limit exceeded. Please wait a few minutes before submitting another message.',
          code: 'RATE_LIMITED',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, private',
          },
        }
      );
    }

    // 3. Parse JSON Body
    let body: ContactRequestBody;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON payload in request body.',
          code: 'INVALID_JSON',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, private',
          },
        }
      );
    }

    const { name, email, category, message, _gotcha } = body;

    // 4. Honeypot Anti-Spam Check (Silently discard bot submissions)
    if (_gotcha && _gotcha.trim().length > 0) {
      console.warn(`[AntiSpam] Honeypot triggered from IP ${clientIp}`);
      return new Response(
        JSON.stringify({
          success: true,
          referenceId: 'VH-SPAM-FILTERED',
          message: 'Thank you for your feedback.',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, private',
          },
        }
      );
    }

    // 5. Input Validation
    const cleanName = (name || '').trim();
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanCategory = (category || 'general').trim();
    const cleanMessage = (message || '').trim();

    if (!cleanName || cleanName.length < 2 || cleanName.length > 100) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please provide a valid name (2 to 100 characters).',
          code: 'INVALID_NAME',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' },
        }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please provide a valid email address.',
          code: 'INVALID_EMAIL',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' },
        }
      );
    }

    if (!VALID_CATEGORIES[cleanCategory]) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Please select a valid inquiry category.',
          code: 'INVALID_CATEGORY',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' },
        }
      );
    }

    if (!cleanMessage || cleanMessage.length < 10 || cleanMessage.length > 3000) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Message must be between 10 and 3,000 characters.',
          code: 'INVALID_MESSAGE',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private' },
        }
      );
    }

    // 6. Generate Reference Tracking ID & Vancouver Timestamp
    const referenceId = generateReferenceId();
    const vancouverTime = new Date().toLocaleString('en-CA', {
      timeZone: 'America/Vancouver',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const categoryInfo = VALID_CATEGORIES[cleanCategory] || { label: 'General', emoji: '📬' };
    const subject = `${categoryInfo.emoji} [${cleanCategory.toUpperCase().replace(/_/g, ' ')}] ${cleanName} — VanHeartbeat`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6; background-color: #f8fafc; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; background: #e0f2fe; color: #0369a1; }
    .meta-table { width: 100%; margin: 16px 0; border-collapse: collapse; }
    .meta-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .meta-label { font-weight: bold; color: #64748b; width: 30%; }
    .message-box { background: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; margin: 20px 0; border-radius: 0 12px 12px 0; font-size: 14px; white-space: pre-wrap; color: #0f172a; }
    .footer { font-size: 11px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0 0 6px 0; color: #0f172a;">VanHeartbeat Feedback Submission</h2>
      <span class="badge">${categoryInfo.emoji} ${categoryInfo.label}</span>
    </div>

    <table class="meta-table">
      <tr><td class="meta-label">Reference ID</td><td><strong>${referenceId}</strong></td></tr>
      <tr><td class="meta-label">Submitter</td><td>${cleanName} (&lt;<a href="mailto:${cleanEmail}">${cleanEmail}</a>&gt;)</td></tr>
      <tr><td class="meta-label">Timestamp</td><td>${vancouverTime} (Vancouver Time)</td></tr>
      <tr><td class="meta-label">Client IP</td><td>${clientIp}</td></tr>
    </table>

    <div style="font-size: 13px; font-weight: bold; color: #334155; margin-top: 16px;">Message Content:</div>
    <div class="message-box">${cleanMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>

    <div class="footer">
      This notification was automatically dispatched from the VanHeartbeat Edge Server (vanheartbeat.com/contact).<br>
      To respond directly to the submitter, simply hit <strong>Reply</strong> in your email client.
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
[VanHeartbeat Submission]
Reference ID: ${referenceId}
Category: ${categoryInfo.label}
Submitter: ${cleanName} <${cleanEmail}>
Timestamp: ${vancouverTime}
IP: ${clientIp}

Message:
${cleanMessage}

--------------------------------------------------
To reply to the sender, reply directly to this email.
    `.trim();

    // 7. Email Dispatch Pipeline via Native Cloudflare Email Worker Binding
    const targetRecipient = getEnv('CONTACT_RECIPIENT_EMAIL') || 'contact@vanheartbeat.com';
    const emailBinding = runtimeEnv.EMAIL;
    const resendApiKey = getEnv('RESEND_API_KEY');

    if (emailBinding && typeof emailBinding.send === 'function') {
      try {
        await emailBinding.send({
          to: targetRecipient,
          from: 'contact@vanheartbeat.com',
          replyTo: cleanEmail,
          subject: subject,
          html: htmlContent,
          text: textContent,
        });
        console.log(`[CloudflareEmailSuccess] Dispatched alert ${referenceId} via env.EMAIL binding to ${targetRecipient}`);
      } catch (cfErr: any) {
        console.error('[CloudflareEmailError]', cfErr?.message || cfErr);
      }
    } else if (resendApiKey) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'VanHeartbeat Alerts <telemetry@vanheartbeat.com>',
          to: [targetRecipient],
          reply_to: cleanEmail,
          subject: subject,
          html: htmlContent,
          text: textContent,
        }),
      });

      if (!emailRes.ok) {
        const errData = await emailRes.text();
        console.error('[EmailDispatchError]', errData);
      } else {
        console.log(`[EmailDispatchSuccess] Delivered alert ${referenceId} to ${targetRecipient}`);
      }
    } else {
      // Edge Local / Preview Safe Fallback: Log email details cleanly
      console.log(`[EmailDispatchDevFallback] Alert ${referenceId} prepared for ${targetRecipient}:`, {
        from: cleanEmail,
        name: cleanName,
        category: cleanCategory,
        subject,
      });
    }

    // 8. Return Success to Client with Reference ID
    return new Response(
      JSON.stringify({
        success: true,
        referenceId,
        message: 'Your message has been sent to the VanHeartbeat operations team. Data corrections are reviewed promptly within 2 hours.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, private',
        },
      }
    );
  } catch (error: any) {
    console.error('[ContactApiError]', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected edge server error occurred while sending your message. Please try again or email contact@vanheartbeat.com directly.',
        code: 'INTERNAL_SERVER_ERROR',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, private',
        },
      }
    );
  }
};
