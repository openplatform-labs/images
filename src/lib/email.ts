import nodemailer from "nodemailer";
import { config, isSmtpConfigured } from "./config";

function createTransport() {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP 설정이 완료되지 않았습니다.");
  }

  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

export async function sendAuthCodeEmail(params: {
  to: string;
  code: string;
  purpose: "login" | "reset";
}): Promise<void> {
  const transport = createTransport();
  const subject =
    params.purpose === "reset"
      ? "[OpenSphere Logos] 비밀번호 재설정 인증 코드"
      : "[OpenSphere Logos] 관리자 로그인 인증 코드";

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#3dd6c3">OpenSphere Logos</h2>
      <p>관리자 인증 코드입니다.</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0a0e14">${params.code}</p>
      <p style="color:#666;font-size:13px">이 코드는 ${config.otpExpireMinutes}분간 유효합니다. 본인이 요청하지 않았다면 무시하세요.</p>
    </div>
  `;

  await transport.sendMail({
    from: config.smtp.from,
    to: params.to,
    subject,
    html,
    text: `인증 코드: ${params.code} (${config.otpExpireMinutes}분 유효)`,
  });
}

export async function verifySmtpConnection(): Promise<boolean> {
  try {
    const transport = createTransport();
    await transport.verify();
    return true;
  } catch {
    return false;
  }
}
