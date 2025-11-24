import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, cc, subject, html } = body;

    if (!to || !to.length) {
      return NextResponse.json(
        { success: false, error: 'En az bir alıcı gerekli (To)' },
        { status: 400 }
      );
    }

    if (!html) {
      return NextResponse.json(
        { success: false, error: 'Email içeriği boş' },
        { status: 400 }
      );
    }

    // SMTP ayarları - .env.local'den al
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Email gönder
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to.join(', '),
      cc: cc && cc.length > 0 ? cc.join(', ') : undefined,
      subject: subject || 'Crew Ticketing Request',
      html,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'Email başarıyla gönderildi',
    });
  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Email gönderme hatası' },
      { status: 500 }
    );
  }
}
