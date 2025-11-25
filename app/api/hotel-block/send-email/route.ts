import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, cc, subject, text, excelBase64, filename } = body;

    if (!to || !to.length) {
      return NextResponse.json(
        { success: false, error: 'En az bir alıcı gerekli' },
        { status: 400 }
      );
    }

    if (!text || !excelBase64 || !filename) {
      return NextResponse.json(
        { success: false, error: 'Email içeriği, Excel dosyası ve dosya adı gerekli' },
        { status: 400 }
      );
    }

    // SMTP setup
    const rawHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const host = rawHost.replace(/^\w+:\/\//, '').trim();
    const port = Number(process.env.SMTP_PORT || (process.env.SMTP_SECURE === 'true' ? 465 : 587));
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

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

    // Email gönder (Excel attachment ile)
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: to.join(', '),
      cc: cc && cc.length > 0 ? cc.join(', ') : undefined,
      subject: subject || 'Hotel Blokaj Update',
      text,
      attachments: [
        {
          filename,
          content: Buffer.from(excelBase64, 'base64'),
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'Email başarıyla gönderildi',
    });
  } catch (error: any) {
    console.error('Hotel block send email error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Email gönderme hatası' },
      { status: 500 }
    );
  }
}
