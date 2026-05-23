import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

// Instantiates Resend client if key is configured
const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Sends a transactional email using the official Resend SDK.
 * If no RESEND_API_KEY is found in the environment, it gracefully
 * falls back to logging the formatted email HTML and invitation link
 * to the terminal console, preventing application crashes.
 */
export async function sendMail(to: string, subject: string, html: string): Promise<any> {
  const fromName = process.env.SMTP_FROM_NAME || 'OmniTask Team';
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'onboarding@resend.dev';

  if (!resend || !resendApiKey) {
    console.log('\n============================================================');
    console.log('🛡️  [MailService] RESEND_API_KEY not configured in .env!');
    console.log(`🛡️  [MailService] Local Developer Console Fallback:`);
    console.log(`🛡️  [MailService] From: "${fromName}" <${fromEmail}>`);
    console.log(`🛡️  [MailService] To: ${to}`);
    console.log(`🛡️  [MailService] Subject: ${subject}`);
    console.log(`🛡️  [MailService] Rendered HTML Body:`);
    console.log('------------------------------------------------------------');
    console.log(html);
    console.log('============================================================\n');
    return { success: true, localLogged: true };
  }

  try {
    const response = await resend.emails.send({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
    });

    if (response.error) {
      const errMsg = response.error.message;
      const isSandboxRestriction = errMsg.includes('only send testing emails') || 
                                   errMsg.includes('verify a domain') ||
                                   errMsg.includes('own email address');
      
      if (isSandboxRestriction) {
        console.log('\n============================================================');
        console.log('⚠️  [MailService] Resend Sandbox Restriction Detected!');
        console.log(`⚠️  To: ${to}`);
        console.log('⚠️  Resend sandbox only allows sending to your registered account email.');
        console.log('⚠️  Falling back to printing the formatted invitation card to the console:');
        console.log('------------------------------------------------------------');
        console.log(`From: "${fromName}" <${fromEmail}>`);
        console.log(`Subject: ${subject}`);
        console.log(`Rendered HTML Body:`);
        console.log(html);
        console.log('============================================================\n');
        return { success: true, localLogged: true, sandboxRestriction: true };
      }

      // In development mode, capture any Resend API error and fall back gracefully
      if (process.env.NODE_ENV === 'development') {
        console.log('\n============================================================');
        console.log('⚠️  [MailService] Resend API Error Caught in Local Development!');
        console.log(`⚠️  Error Details: ${errMsg}`);
        console.log(`⚠️  To: ${to}`);
        console.log('⚠️  Falling back to printing the formatted invitation card to the console:');
        console.log('------------------------------------------------------------');
        console.log(`From: "${fromName}" <${fromEmail}>`);
        console.log(`Subject: ${subject}`);
        console.log(`Rendered HTML Body:`);
        console.log(html);
        console.log('============================================================\n');
        return { success: true, localLogged: true, errorCaught: errMsg };
      }

      throw new Error(`Resend email delivery failed: ${errMsg}`);
    }

    return response.data;
  } catch (error: any) {
    const errMsg = error?.message || '';
    const isSandboxRestriction = errMsg.includes('only send testing emails') || 
                                 errMsg.includes('verify a domain') ||
                                 errMsg.includes('own email address');

    if (isSandboxRestriction) {
      console.log('\n============================================================');
      console.log('⚠️  [MailService] Resend Sandbox Restriction Caught!');
      console.log(`⚠️  To: ${to}`);
      console.log('⚠️  Resend sandbox only allows sending to your registered account email.');
      console.log('⚠️  Falling back to printing the formatted invitation card to the console:');
      console.log('------------------------------------------------------------');
      console.log(`From: "${fromName}" <${fromEmail}>`);
      console.log(`Subject: ${subject}`);
      console.log(`Rendered HTML Body:`);
      console.log(html);
      console.log('============================================================\n');
      return { success: true, localLogged: true, sandboxRestriction: true };
    }

    // In development mode, catch all network/DNS/fetching failures and fall back gracefully
    if (process.env.NODE_ENV === 'development') {
      console.log('\n============================================================');
      console.log('⚠️  [MailService] Resend Network/SDK Error Caught in Local Development!');
      console.log(`⚠️  Error Details: ${errMsg}`);
      console.log(`⚠️  To: ${to}`);
      console.log('⚠️  Falling back to printing the formatted invitation card to the console:');
      console.log('------------------------------------------------------------');
      console.log(`From: "${fromName}" <${fromEmail}>`);
      console.log(`Subject: ${subject}`);
      console.log(`Rendered HTML Body:`);
      console.log(html);
      console.log('============================================================\n');
      return { success: true, localLogged: true, errorCaught: errMsg };
    }

    throw error;
  }
}
