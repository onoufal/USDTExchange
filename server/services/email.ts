import { MailService } from '@sendgrid/mail';

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY!);

export interface SendVerificationEmailParams {
  to: string;
  verificationToken: string;
}

export async function sendVerificationEmail({ to, verificationToken }: SendVerificationEmailParams) {
  const verificationUrl = `${process.env.VITE_APP_URL}/auth/verify?token=${verificationToken}`;
  
  try {
    await mailService.send({
      to,
      from: 'noreply@exchangepro.com', // Update this with your verified sender
      subject: 'Verify your ExchangePro account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0066cc;">Welcome to ExchangePro!</h1>
          <p>Please verify your email address to complete your registration.</p>
          <p style="margin: 20px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #0066cc; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email Address
            </a>
          </p>
          <p style="color: #666;">
            If the button doesn't work, copy and paste this link into your browser:
            <br>
            ${verificationUrl}
          </p>
          <p style="color: #666; font-size: 0.9em;">
            If you didn't create an account with ExchangePro, please ignore this email.
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}
