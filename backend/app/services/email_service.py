import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.future import select
from app.models.database import AsyncSessionLocal, SystemSetting
from app.config import (
    SMTP_SERVER as DEFAULT_SMTP_SERVER,
    SMTP_PORT as DEFAULT_SMTP_PORT,
    SMTP_USERNAME as DEFAULT_SMTP_USERNAME,
    SMTP_PASSWORD as DEFAULT_SMTP_PASSWORD,
    NOTIFICATION_EMAIL as DEFAULT_NOTIFICATION_EMAIL
)

logger = logging.getLogger(__name__)

async def get_setting_value(key: str, default: str = "") -> str:
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(SystemSetting).where(SystemSetting.key == key))
            row = result.scalar_one_or_none()
            if row and row.value:
                return row.value
    except Exception as e:
        logger.warning(f"Could not load setting {key} from DB: {e}")
    return default

async def send_complaint_email(issue_details: dict):
    """
    Sends an SMTP email alert for a newly registered campus issue/complaint.
    """
    smtp_server = await get_setting_value("SMTP_SERVER", DEFAULT_SMTP_SERVER)
    smtp_port = int(await get_setting_value("SMTP_PORT", str(DEFAULT_SMTP_PORT)))
    smtp_user = await get_setting_value("SMTP_USERNAME", DEFAULT_SMTP_USERNAME)
    smtp_pass = await get_setting_value("SMTP_PASSWORD", DEFAULT_SMTP_PASSWORD)
    recipient = await get_setting_value("NOTIFICATION_EMAIL", DEFAULT_NOTIFICATION_EMAIL or smtp_user)

    if not smtp_user or not smtp_pass:
        logger.warning("SMTP username or app password not configured. Email alert skipped.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🚨 Campus Alert: New Complaint Reported [{issue_details.get('category', 'General')}]"
        msg["From"] = f"BIT Campus Assistant <{smtp_user}>"
        msg["To"] = recipient if recipient else smtp_user

        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px;">
            <div style="max-width: 600px; margin: auto; background-color: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #38bdf8;">
              <h2 style="color: #38bdf8; margin-top: 0;">🏛️ Bannari Amman Institute of Technology</h2>
              <h3 style="color: #f43f5e;">New Campus Complaint Registered</h3>
              <table style="width: 100%; border-collapse: collapse; color: #e2e8f0; margin-top: 15px;">
                <tr><td style="padding: 8px; font-weight: bold; width: 120px;">User:</td><td style="padding: 8px;">{issue_details.get('user_name', 'Guest')}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Category:</td><td style="padding: 8px; color: #fbbf24;">{issue_details.get('category', 'General')}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Location:</td><td style="padding: 8px;">{issue_details.get('location', 'Unknown')}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Description:</td><td style="padding: 8px; background-color: #0f172a; border-radius: 6px;">{issue_details.get('description', 'N/A')}</td></tr>
                <tr><td style="padding: 8px; font-weight: bold;">Priority:</td><td style="padding: 8px;">{issue_details.get('priority', 'medium').upper()}</td></tr>
              </table>
              <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">Automated notification from Multilingual AI Campus Assistant.</p>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)

        logger.info(f"Complaint email notification sent successfully to {recipient or smtp_user}")
        return True
    except Exception as e:
        logger.error(f"Failed to send SMTP email: {e}")
        return False

async def send_resolution_email(issue_details: dict):
    """
    Sends an SMTP email notification to the user when their reported issue is marked solved/resolved by Admin.
    """
    smtp_server = await get_setting_value("SMTP_SERVER", DEFAULT_SMTP_SERVER)
    smtp_port = int(await get_setting_value("SMTP_PORT", str(DEFAULT_SMTP_PORT)))
    smtp_user = await get_setting_value("SMTP_USERNAME", DEFAULT_SMTP_USERNAME)
    smtp_pass = await get_setting_value("SMTP_PASSWORD", DEFAULT_SMTP_PASSWORD)
    
    # Target user email
    user_email = issue_details.get("user_email")
    user_name = issue_details.get("user_name", "Student / Campus User")
    issue_id = issue_details.get("id", "")
    category = issue_details.get("category", "Campus Facility")
    location = issue_details.get("location", "Campus")
    description = issue_details.get("description", "")
    admin_notes = issue_details.get("admin_notes", "The issue has been inspected and resolved by the campus maintenance department.")

    if not user_email:
        logger.info(f"No recipient email found for resolved issue #{issue_id}. Simulated resolution alert logged.")
        return False

    if not smtp_user or not smtp_pass:
        logger.warning(f"SMTP credentials not configured. Resolution email for Issue #{issue_id} simulated to {user_email}.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"✅ Issue Solved: Your Campus Report #{issue_id} has been Resolved [{category}]"
        msg["From"] = f"BIT Campus Admin <{smtp_user}>"
        msg["To"] = user_email

        html_content = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #09090b; color: #fafafa; padding: 24px;">
            <div style="max-width: 600px; margin: auto; background-color: #18181b; padding: 28px; border-radius: 16px; border: 1px solid #10b981;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                <span style="font-size: 24px;">🏛️</span>
                <div>
                  <h2 style="color: #fafafa; margin: 0; font-size: 18px;">Bannari Amman Institute of Technology</h2>
                  <p style="color: #10b981; margin: 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">Campus Maintenance & Support Cell</p>
                </div>
              </div>

              <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 14px; margin-top: 15px;">
                <h3 style="color: #10b981; margin: 0; font-size: 16px;">🎉 Good news, {user_name}! Your issue is resolved.</h3>
                <p style="color: #d4d4d8; font-size: 13px; margin: 5px 0 0 0;">Our maintenance team has attended to your campus report and marked it as completed.</p>
              </div>

              <table style="width: 100%; border-collapse: collapse; color: #e4e4e7; margin-top: 20px; font-size: 14px;">
                <tr style="border-bottom: 1px solid #27272a;"><td style="padding: 10px; font-weight: bold; width: 130px; color: #a1a1aa;">Issue ID:</td><td style="padding: 10px; font-weight: bold; color: #10b981;">#{issue_id}</td></tr>
                <tr style="border-bottom: 1px solid #27272a;"><td style="padding: 10px; font-weight: bold; color: #a1a1aa;">Category:</td><td style="padding: 10px;">{category}</td></tr>
                <tr style="border-bottom: 1px solid #27272a;"><td style="padding: 10px; font-weight: bold; color: #a1a1aa;">Location:</td><td style="padding: 10px;">{location}</td></tr>
                <tr style="border-bottom: 1px solid #27272a;"><td style="padding: 10px; font-weight: bold; color: #a1a1aa;">Report Details:</td><td style="padding: 10px;">{description}</td></tr>
                <tr><td style="padding: 10px; font-weight: bold; color: #a1a1aa;">Admin Action Notes:</td><td style="padding: 10px; background-color: #27272a; border-radius: 8px; color: #34d399;">{admin_notes}</td></tr>
              </table>

              <p style="margin-top: 24px; font-size: 12px; color: #71717a; text-align: center;">
                Need further assistance? Reply to this email or speak with the BIT Digital Human assistant.
              </p>
            </div>
          </body>
        </html>
        """
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)

        logger.info(f"Resolution email dispatched to {user_email} for issue #{issue_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to send resolution SMTP email: {e}")
        return False

