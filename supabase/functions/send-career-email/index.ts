// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";


const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RECIPIENT_EMAIL = 'ankush170306@gmail.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { full_name, email, phone, position, experience_years, portfolio_url, cover_letter, resume_url } = await req.json();

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const htmlBody = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #166534, #15803d); padding: 24px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 22px;">New Career Application</h1>
          <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">LocalCricket - ${position}</p>
        </div>
        <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-size: 13px; width: 140px; vertical-align: top;">Full Name</td>
              <td style="padding: 10px 0; font-size: 14px; font-weight: 600;">${full_name}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-size: 13px; vertical-align: top;">Email</td>
              <td style="padding: 10px 0; font-size: 14px;"><a href="mailto:${email}" style="color: #166534;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-size: 13px; vertical-align: top;">Phone</td>
              <td style="padding: 10px 0; font-size: 14px;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-size: 13px; vertical-align: top;">Experience</td>
              <td style="padding: 10px 0; font-size: 14px;">${experience_years} year(s)</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-size: 13px; vertical-align: top;">Portfolio</td>
              <td style="padding: 10px 0; font-size: 14px;">${portfolio_url !== 'Not provided' ? `<a href="${portfolio_url}" style="color: #166534;">${portfolio_url}</a>` : 'Not provided'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6b7280; font-size: 13px; vertical-align: top;">Resume</td>
              <td style="padding: 10px 0; font-size: 14px;">${resume_url ? `<a href="${resume_url}" style="color: #166534; font-weight: 600;">📎 Download Resume</a>` : 'Not provided'}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="color: #6b7280; font-size: 13px; margin-bottom: 8px;">Cover Letter</p>
          <div style="background: white; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p style="font-size: 14px; line-height: 1.7; color: #374151; margin: 0; white-space: pre-wrap;">${cover_letter}</p>
          </div>
          <p style="color: #9ca3af; font-size: 11px; margin-top: 20px; text-align: center;">This email was sent from the LocalCricket careers page</p>
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'LocalCricket Careers <onboarding@resend.dev>',
        to: [RECIPIENT_EMAIL],
        subject: `New Application: ${position} - ${full_name}`,
        html: htmlBody,
        reply_to: email,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
