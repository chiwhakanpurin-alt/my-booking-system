import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { rateLimit, getIP } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY);
const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@booking.com';

export async function POST(request: Request) {
  try {
    const ip = getIP(request);
    const { success } = rateLimit(ip, 3, 60 * 1000); // 3 feedbacks per minute
    if (!success) {
      return NextResponse.json({ success: false, message: 'ส่งบ่อยเกินไป กรุณารอสักครู่' }, { status: 429 });
    }

    const { name, email, message } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ success: false, message: 'กรุณาระบุรายละเอียดปัญหา' }, { status: 400 });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: -apple-system, sans-serif; color: #333; }
          .container { padding: 20px; max-width: 600px; margin: 0 auto; }
          .header { background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .label { font-weight: bold; color: #ef4444; }
          .box { margin-top: 15px; padding: 15px; background: white; border: 1px solid #ddd; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🚨 มีรายงานปัญหาใหม่ (Feedback)</h2>
          </div>
          <div class="content">
            <p><span class="label">ผู้รายงาน:</span> ${name || 'ไม่ระบุ'}</p>
            <p><span class="label">อีเมลติดต่อ:</span> ${email || 'ไม่ระบุ'}</p>
            <div class="box">
              <p class="label">รายละเอียดปัญหา:</p>
              <p>${message.replace(/\n/g, '<br>')}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: adminEmail,
      subject: `🚨 รายงานปัญหา: ${message.substring(0, 30)}...`,
      html: htmlContent,
    });

    return NextResponse.json({ success: true, message: 'ส่งรายงานสำเร็จ' }, { status: 200 });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ success: false, message: 'เกิดข้อผิดพลาดในการส่งรายงาน' }, { status: 500 });
  }
}
