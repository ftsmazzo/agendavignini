export function caixaConfigurada() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM,
  );
}

export async function enviarTexto(
  para: string,
  assunto: string,
  corpo: string,
) {
  if (!caixaConfigurada()) {
    return false;
  }

  const nodemailer = await import("nodemailer");
  const porta = Number(process.env.SMTP_PORT || 587);
  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: porta,
    secure: porta === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporte.sendMail({
    from: process.env.SMTP_FROM_NAME
      ? `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`
      : process.env.SMTP_FROM,
    to: para,
    subject: assunto,
    text: corpo,
  });

  return true;
}
