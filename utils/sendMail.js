import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"HireMind AI" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: `Your HireMind AI Verification Code - ${otp}`,

    text: `
Welcome to HireMind AI!

Your verification code is: ${otp}

This code expires in 5 minutes.

If you didn't request this code, simply ignore this email.

Regards,
HireMind AI
    `,

    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;background:#f7fafc;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:10px;margin:30px auto;">

<tr>
<td style="background:#15803d;padding:30px;color:white;font-size:28px;font-weight:bold;">
HireMind AI
</td>
</tr>

<tr>
<td style="padding:40px;">

<p style="font-size:16px;color:#444;">
Thank you for registering.
</p>

<p style="font-size:16px;color:#444;">
Use the OTP below to verify your account.
</p>

<div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:10px;padding:25px;text-align:center;margin:30px 0;">

<div style="font-size:13px;color:#166534;font-weight:bold;">
Verification Code
</div>

<div style="font-size:40px;font-family:monospace;color:#15803d;font-weight:bold;letter-spacing:8px;">
${otp}
</div>

</div>

<p style="background:#fefce8;padding:15px;border-radius:8px;color:#854d0e;">
⏰ This OTP expires in <strong>5 minutes</strong>.
</p>

<hr>

<p style="font-size:13px;color:#777;">
If you didn't request this email, simply ignore it.
</p>

</td>
</tr>

<tr>
<td style="background:#f7fafc;padding:20px;text-align:center;font-size:12px;color:#999;">
© 2026 HireMind AI. All rights reserved.
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ OTP sent successfully:", email);
    return true;
  } catch (error) {
    console.error("Brevo Error:", error);
    throw new Error("Failed to send verification email.");
  }
};

export default sendOTP;
