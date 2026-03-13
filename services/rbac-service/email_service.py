"""Email sending utilities for RBAC service."""

from email.message import EmailMessage
import logging
from typing import Iterable, Optional
from datetime import datetime

import aiosmtplib

from config import get_settings

logger = logging.getLogger(__name__)


async def send_email(
    to: str | Iterable[str],
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> None:
  """Send an email using the configured SMTP provider.

  Failures are logged but not raised so they don't break primary flows.
  """
  settings = get_settings()

  if not settings.smtp_host or not settings.smtp_from_email:
    logger.warning("SMTP not fully configured; skipping email send")
    return

  if isinstance(to, str):
    recipients = [to]
  else:
    recipients = list(to)

  if not recipients:
    logger.warning("send_email called with no recipients")
    return

  msg = EmailMessage()
  from_display = settings.smtp_from_name or settings.smtp_from_email
  msg["From"] = f"{from_display} <{settings.smtp_from_email}>"
  msg["To"] = ", ".join(recipients)
  msg["Subject"] = subject
  if reply_to:
    msg["Reply-To"] = reply_to

  if text_body:
    msg.set_content(text_body)
    msg.add_alternative(html_body, subtype="html")
  else:
    msg.add_alternative(html_body, subtype="html")

  try:
    await aiosmtplib.send(
      msg,
      hostname=settings.smtp_host,
      port=settings.smtp_port,
      username=settings.smtp_user,
      password=settings.smtp_password,
      start_tls=settings.smtp_use_tls,
    )
    logger.info("Email sent to %s with subject '%s'", recipients, subject)
  except Exception:
    logger.exception("Failed to send email to %s with subject '%s'", recipients, subject)


def render_otp_email(code: str, validity_minutes: int = 10) -> tuple[str, str]:
  """Return (subject, html_body) for an OTP email."""
  subject = "Your verification code for The Little URL"
  year = datetime.utcnow().year
  html = f"""
<html>
  <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color:#020617; color:#e5e7eb; padding:24px;">
    <div style="max-width:480px;margin:0 auto;background-color:#020617;border-radius:16px;border:1px solid #1f2937;">
      <div style="padding:24px 24px 8px 24px;">
        <div style="display:inline-flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:12px;background:linear-gradient(135deg,#22c7be,#6366f1);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;">tl</div>
          <div style="display:flex;flex-direction:column;">
            <span style="font-size:14px;font-weight:600;color:#f9fafb;">The Little URL</span>
            <span style="font-size:11px;color:#9ca3af;">Pixel transformation for links.</span>
          </div>
        </div>
      </div>
      <div style="padding:8px 24px 24px 24px;">
        <h1 style="font-size:20px;margin:16px 0 8px 0;color:#f9fafb;">Your verification code</h1>
        <p style="font-size:14px;line-height:1.6;color:#d1d5db;margin:0 0 16px 0;">
          Use the code below to verify your email address. This code will expire in {validity_minutes} minutes.
        </p>
        <div style="margin:16px 0 24px 0;">
          <div style="display:inline-block;padding:12px 24px;border-radius:9999px;background-color:#020617;border:1px solid #22c7be1a;color:#22c7be;font-size:22px;letter-spacing:0.32em;font-weight:600;">
            {code}
          </div>
        </div>
        <p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0 0 8px 0;">
          If you didn&apos;t request this, you can safely ignore this email.
        </p>
      </div>
      <div style="padding:16px 24px 20px 24px;border-top:1px solid #111827;">
        <p style="margin:0;font-size:11px;color:#6b7280;">
          © {year} The Little URL. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>
""".strip()
  return subject, html


def render_welcome_email(name: Optional[str]) -> tuple[str, str]:
  """Return (subject, html_body) for a welcome email after signup."""
  subject = "Welcome to The Little URL"
  display_name = name or "there"
  year = datetime.utcnow().year
  html = f"""
<html>
  <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color:#020617; color:#e5e7eb; padding:24px;">
    <div style="max-width:480px;margin:0 auto;background-color:#020617;border-radius:16px;border:1px solid #1f2937;">
      <div style="padding:24px 24px 16px 24px;">
        <h1 style="font-size:20px;margin:0 0 8px 0;color:#f9fafb;">Welcome, {display_name} 👋</h1>
        <p style="font-size:14px;line-height:1.6;color:#d1d5db;margin:0 0 12px 0;">
          Thanks for signing up for <strong>The Little URL</strong>.
        </p>
        <p style="font-size:14px;line-height:1.6;color:#d1d5db;margin:0 0 16px 0;">
          You can now create short links, QR codes, and track documents with beautiful analytics.
        </p>
        <p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0;">
          If you didn&apos;t create this account, you can ignore this email.
        </p>
      </div>
      <div style="padding:16px 24px 20px 24px;border-top:1px solid #111827;">
        <p style="margin:0;font-size:11px;color:#6b7280;">
          © {year} The Little URL. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>
""".strip()
  return subject, html


def render_invitation_email(
  org_name: str,
  role: str,
  accept_url: str,
) -> tuple[str, str]:
  """Return (subject, html_body) for an organization invitation email."""
  subject = f"You've been invited to {org_name} on The Little URL"
  year = datetime.utcnow().year
  html = f"""
<html>
  <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color:#020617; color:#e5e7eb; padding:24px;">
    <div style="max-width:480px;margin:0 auto;background-color:#020617;border-radius:16px;border:1px solid #1f2937;">
      <div style="padding:24px 24px 8px 24px;">
        <div style="display:inline-flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:12px;background:linear-gradient(135deg,#22c7be,#6366f1);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:600;font-size:14px;">tl</div>
          <div style="display:flex;flex-direction:column;">
            <span style="font-size:14px;font-weight:600;color:#f9fafb;">The Little URL</span>
            <span style="font-size:11px;color:#9ca3af;">Pixel transformation for links.</span>
          </div>
        </div>
      </div>
      <div style="padding:8px 24px 24px 24px;">
        <h1 style="font-size:20px;margin:16px 0 8px 0;color:#f9fafb;">You&apos;re invited to {org_name}</h1>
        <p style="font-size:14px;line-height:1.6;color:#d1d5db;margin:0 0 12px 0;">
          You&apos;ve been invited to join <strong>{org_name}</strong> as a <strong>{role}</strong> on The Little URL.
        </p>
        <p style="font-size:14px;line-height:1.6;color:#d1d5db;margin:0 0 20px 0;">
          Click the button below to accept your invitation and finish setting up your account.
        </p>
        <div style="margin:8px 0 24px 0;">
          <a href="{accept_url}" style="display:inline-block;padding:10px 20px;border-radius:9999px;background:linear-gradient(135deg,#22c7be,#6366f1);color:#f9fafb;font-size:14px;font-weight:600;text-decoration:none;">
            Accept invitation
          </a>
        </div>
        <p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0 0 8px 0;">
          If the button doesn&apos;t work, copy and paste this link into your browser:
        </p>
        <p style="word-break:break-all;font-size:11px;color:#9ca3af;margin:0 0 16px 0;">
          {accept_url}
        </p>
        <p style="font-size:12px;line-height:1.6;color:#6b7280;margin:0;">
          If you weren&apos;t expecting this invitation, you can safely ignore this email.
        </p>
      </div>
      <div style="padding:16px 24px 20px 24px;border-top:1px solid #111827;">
        <p style="margin:0;font-size:11px;color:#6b7280;">
          © {year} The Little URL. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>
""".strip()
  return subject, html


def render_org_member_joined_email(
  org_name: str,
  member_email: str,
  role: str,
) -> tuple[str, str]:
  """Return (subject, html_body) for 'new member joined' notification."""
  subject = f"New member joined {org_name} on The Little URL"
  year = datetime.utcnow().year
  html = f"""
<html>
  <body style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color:#020617; color:#e5e7eb; padding:24px;">
    <div style="max-width:480px;margin:0 auto;background-color:#020617;border-radius:16px;border:1px solid #1f2937;">
      <div style="padding:24px 24px 16px 24px;">
        <h1 style="font-size:18px;margin:0 0 8px 0;color:#f9fafb;">A new member joined your organization</h1>
        <p style="font-size:14px;line-height:1.6;color:#d1d5db;margin:0 0 8px 0;">
          <strong>{member_email}</strong> has joined <strong>{org_name}</strong> as a <strong>{role}</strong>.
        </p>
        <p style="font-size:13px;line-height:1.6;color:#9ca3af;margin:0;">
          You can manage roles and permissions from your organization settings inside The Little URL dashboard.
        </p>
      </div>
      <div style="padding:16px 24px 20px 24px;border-top:1px solid #111827;">
        <p style="margin:0;font-size:11px;color:#6b7280;">
          © {year} The Little URL. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>
""".strip()
  return subject, html

