import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Nodemailer Node.js runtime gerektirir (Edge desteklemez)
export const runtime = 'nodejs';

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

    // SMTP ayarları - .env.local'den al ve host'u normalize et
    const rawHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const host = rawHost.replace(/^\w+:\/\//, '').trim(); // olası 'smtp://', 'smtps://', 'https://' vb. kaldır
    const port = Number(process.env.SMTP_PORT || (process.env.SMTP_SECURE === 'true' ? 465 : 587));
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    // Basit host doğrulaması (geçersiz karakterleri engelle)
    if (!/^[A-Za-z0-9.-]+$/.test(host)) {
      return NextResponse.json(
        { success: false, error: `SMTP_HOST geçersiz: "${rawHost}"` },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
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
