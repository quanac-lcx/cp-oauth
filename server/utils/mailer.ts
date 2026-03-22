import { consola } from 'consola';
import nodemailer from 'nodemailer';
import { getConfig } from './config';

const logger = consola.withTag('mailer');

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
    const host = await getConfig('smtp_host');
    const port = await getConfig('smtp_port');
    const user = await getConfig('smtp_user');
    const pass = await getConfig('smtp_pass');
    const from = await getConfig('smtp_from');

    if (!host || !user) {
        logger.warn('SMTP not configured, skipping email send');
        return false;
    }

    const transporter = nodemailer.createTransport({
        host,
        port: Number(port) || 587,
        secure: Number(port) === 465,
        auth: { user, pass }
    });

    try {
        await transporter.sendMail({ from, to, subject, html });
        logger.success(`Email sent to ${to}: "${subject}"`);
        return true;
    } catch (err) {
        logger.error(`Failed to send email to ${to}:`, err);
        return false;
    }
}

export async function sendVerificationEmail(
    to: string,
    token: string,
    baseUrl: string
): Promise<boolean> {
    const siteTitle = await getConfig('site_title');
    const verifyUrl = `${baseUrl}/api/auth/verify?token=${token}`;
    const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #171717;">${siteTitle}</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}" style="color: #000; font-weight: 600;">${verifyUrl}</a></p>
      <p style="color: #666; font-size: 13px;">If you did not create an account, please ignore this email.</p>
    </div>
  `;
    return sendMail(to, `Verify your email — ${siteTitle}`, html);
}
