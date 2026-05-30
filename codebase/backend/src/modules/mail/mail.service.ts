import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly enabled: boolean;
  private readonly fromEmail: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || '587');
    const secure = (this.configService.get<string>('SMTP_SECURE') || 'false') === 'true';
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromEmail =
      this.configService.get<string>('MAIL_FROM') ||
      this.configService.get<string>('SMTP_USER') ||
      'no-reply@contentpilot.local';

    this.enabled = !!(host && user && pass);
    if (!this.enabled) {
      this.transporter = null;
      this.logger.warn('SMTP is not fully configured. Email delivery is disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<boolean> {
    const subject = 'Reset your ContentPilot AI password';
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <h2>Reset your password</h2>
        <p>We received a request to reset your ContentPilot AI password.</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;padding:10px 14px;background:#06b6d4;color:#111;text-decoration:none;border-radius:8px;font-weight:700;">
            Reset Password
          </a>
        </p>
        <p>If the button does not work, use this link:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link expires in 30 minutes.</p>
      </div>
    `;
    return this.sendMail(toEmail, subject, html);
  }

  async sendWorkspaceInviteEmail(
    toEmail: string,
    workspaceName: string,
    role: string,
    inviterName?: string,
    tempPassword?: string,
  ): Promise<boolean> {
    const subject = `You were invited to "${workspaceName}" on ContentPilot AI`;
    const inviterText = inviterName ? `${inviterName} invited you` : 'You were invited';
    
    let html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <h2>Workspace Invitation</h2>
        <p>${inviterText} to join <strong>${workspaceName}</strong>.</p>
        <p>Your role: <strong>${role}</strong></p>
    `;

    if (tempPassword) {
      html += `
        <div style="background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:20px 0;">
          <h3 style="margin-top:0; color:#0f172a;">Your Account Credentials</h3>
          <p style="margin:4px 0;">A new user account has been registered for you. Log in using:</p>
          <p style="margin:4px 0;">Email: <strong>${toEmail}</strong></p>
          <p style="margin:4px 0;">Temporary Password: <code style="background:#e2e8f0; padding:2px 4px; border-radius:4px; font-weight:bold;">${tempPassword}</code></p>
          <p style="margin:10px 0 0 0; font-size:12px; color:#64748b;"><em>* Please make sure to change your password immediately after logging in.</em></p>
        </div>
      `;
    }

    html += `
        <p>Sign in to your account and open the workspace dashboard to get started.</p>
      </div>
    `;
    
    return this.sendMail(toEmail, subject, html);
  }

  private async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`Email skipped (SMTP disabled): to=${to}, subject="${subject}"`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to,
        subject,
        html,
      });
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${to}: ${error?.message || 'Unknown error'}`);
      return false;
    }
  }
}

