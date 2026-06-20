import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@booking.com';

interface EmailNotificationData {
  activityName: string;
  bookedBy: string;
  roomName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  details?: string;
  userEmail?: string;
}

// 📧 Send booking request notification to admin
export async function sendBookingNotificationToAdmin(data: EmailNotificationData) {
  try {
    const { activityName, bookedBy, roomName, bookingDate, startTime, endTime, details } = data;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-row { display: flex; margin-bottom: 15px; }
          .label { font-weight: bold; color: #667eea; min-width: 120px; }
          .value { color: #555; }
          .button { display: inline-block; margin-top: 20px; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; }
          .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 มีการจองห้องประชุมใหม่</h1>
          </div>
          <div class="content">
            <p>สวัสดีค่ะ</p>
            <p>มีการขอใช้ห้องประชุมใหม่ที่รอการอนุมัติ</p>
            
            <div class="info-row">
              <span class="label">📋 กิจกรรม:</span>
              <span class="value">${activityName}</span>
            </div>
            <div class="info-row">
              <span class="label">👤 ผู้จอง:</span>
              <span class="value">${bookedBy}</span>
            </div>
            <div class="info-row">
              <span class="label">🏢 ห้องประชุม:</span>
              <span class="value">${roomName}</span>
            </div>
            <div class="info-row">
              <span class="label">📅 วันที่:</span>
              <span class="value">${new Date(bookingDate).toLocaleDateString('th-TH')}</span>
            </div>
            <div class="info-row">
              <span class="label">⏰ เวลา:</span>
              <span class="value">${startTime} - ${endTime}</span>
            </div>
            ${details ? `<div class="info-row">
              <span class="label">📝 หมายเหตุ:</span>
              <span class="value">${details}</span>
            </div>` : ''}
            
            <a href="https://booking.your-domain.com/admin" class="button">ไปที่ระบบจัดการ</a>
            
            <p style="margin-top: 30px; color: #999; font-size: 14px;">
              โปรดเข้าสู่ระบบแล้วตรวจสอบและอนุมัติการจองนี้
            </p>
          </div>
          <div class="footer">
            <p>© 2026 Meeting Room Booking System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: adminEmail,
      subject: `🔔 มีการจองห้องประชุมใหม่ - ${activityName}`,
      html: htmlContent,
    });

    console.log('✅ Email sent to admin:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send admin email:', error);
    throw error;
  }
}

// 📧 Send booking approval notification to user
export async function sendApprovalNotificationToUser(data: EmailNotificationData) {
  try {
    const { activityName, bookedBy, roomName, bookingDate, startTime, endTime, userEmail } = data;
    
    if (!userEmail) {
      console.warn('⚠️ User email not provided, skipping notification');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-row { display: flex; margin-bottom: 15px; }
          .label { font-weight: bold; color: #10b981; min-width: 120px; }
          .value { color: #555; }
          .success-badge { display: inline-block; background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ การจองของคุณได้รับการอนุมัติแล้ว</h1>
          </div>
          <div class="content">
            <p>สวัสดีคุณ ${bookedBy}</p>
            <p>ยินดีด้วยค่ะ! การจองห้องประชุมของคุณได้รับการอนุมัติแล้ว</p>
            
            <div class="success-badge">อนุมัติแล้ว ✓</div>
            
            <h3 style="color: #10b981; margin-top: 25px;">📋 รายละเอียดการจอง</h3>
            <div class="info-row">
              <span class="label">กิจกรรม:</span>
              <span class="value">${activityName}</span>
            </div>
            <div class="info-row">
              <span class="label">ห้องประชุม:</span>
              <span class="value">${roomName}</span>
            </div>
            <div class="info-row">
              <span class="label">วันที่:</span>
              <span class="value">${new Date(bookingDate).toLocaleDateString('th-TH')}</span>
            </div>
            <div class="info-row">
              <span class="label">เวลา:</span>
              <span class="value">${startTime} - ${endTime}</span>
            </div>
            
            <p style="margin-top: 30px; padding: 15px; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
              📌 โปรดมาถึงห้องในเวลา และเช็คอิน ที่ระบบจองห้องประชุมของเรา
            </p>
          </div>
          <div class="footer">
            <p>© 2026 Meeting Room Booking System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: userEmail,
      subject: `✅ การจองของคุณอนุมัติแล้ว - ${activityName}`,
      html: htmlContent,
    });

    console.log('✅ Email sent to user:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send user email:', error);
    throw error;
  }
}

// 📧 Send booking cancellation notification to user
export async function sendCancellationNotificationToUser(data: EmailNotificationData) {
  try {
    const { activityName, roomName, bookingDate, startTime, endTime, userEmail } = data;
    
    if (!userEmail) {
      console.warn('⚠️ User email not provided, skipping notification');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-row { display: flex; margin-bottom: 15px; }
          .label { font-weight: bold; color: #ef4444; min-width: 120px; }
          .value { color: #555; }
          .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ การจองของคุณถูกยกเลิก</h1>
          </div>
          <div class="content">
            <p>สวัสดีค่ะ</p>
            <p>การจองห้องประชุมของคุณถูกยกเลิกแล้ว</p>
            
            <h3 style="color: #ef4444; margin-top: 25px;">📋 รายละเอียดการจอง</h3>
            <div class="info-row">
              <span class="label">กิจกรรม:</span>
              <span class="value">${activityName}</span>
            </div>
            <div class="info-row">
              <span class="label">ห้องประชุม:</span>
              <span class="value">${roomName}</span>
            </div>
            <div class="info-row">
              <span class="label">วันที่:</span>
              <span class="value">${new Date(bookingDate).toLocaleDateString('th-TH')}</span>
            </div>
            <div class="info-row">
              <span class="label">เวลา:</span>
              <span class="value">${startTime} - ${endTime}</span>
            </div>
            
            <p style="margin-top: 30px; padding: 15px; background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
              หากคุณต้องการจองห้องใหม่ สามารถเข้าสู่ระบบและจองได้ทันที
            </p>
          </div>
          <div class="footer">
            <p>© 2026 Meeting Room Booking System</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: userEmail,
      subject: `❌ การจองของคุณถูกยกเลิก - ${activityName}`,
      html: htmlContent,
    });

    console.log('✅ Email sent to user (cancellation):', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send cancellation email:', error);
    throw error;
  }
}
