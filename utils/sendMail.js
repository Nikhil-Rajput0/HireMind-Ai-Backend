import Brevo from "@getbrevo/brevo";

const apiInstance = new Brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY,
);

const sendOTP = async (email, otp) => {
  try {
    const sendSmtpEmail = new Brevo.SendSmtpEmail();

    sendSmtpEmail.sender = {
      name: "HireMind AI",
      email: process.env.EMAIL_FROM,
    };

    sendSmtpEmail.to = [
      {
        email,
      },
    ];

    sendSmtpEmail.subject = `Your HireMind AI Verification Code - ${otp}`;

    sendSmtpEmail.htmlContent = `
<!DOCTYPE html>
<html>
<body style="margin:0;background:#f7fafc;font-family:Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<table width="560" cellpadding="0" cellspacing="0"
style="background:white;border-radius:10px;margin:30px auto;">

<tr>
<td style="background:#15803d;padding:30px;color:white;
font-size:28px;font-weight:bold;">
HireMind AI
</td>
</tr>

<tr>
<td style="padding:40px;">

<p style="font-size:16px;color:#444;">
Thank you for registering.
</p>

<p style="font-size:16px;color:#444;">
Use the verification code below:
</p>

<div style="
background:#f0fdf4;
border:2px solid #22c55e;
border-radius:10px;
padding:25px;
text-align:center;
margin:30px 0;">

<div style="font-size:13px;color:#166534;font-weight:bold;">
Verification Code
</div>

<div style="
font-size:40px;
font-family:monospace;
color:#15803d;
font-weight:bold;
letter-spacing:8px;">

${otp}

</div>

</div>

<p style="
background:#fefce8;
padding:15px;
border-radius:8px;
color:#854d0e;">

⏰ This code expires in <strong>5 minutes</strong>.

</p>

<hr>

<p style="font-size:13px;color:#777;">
If you didn't request this email, simply ignore it.
</p>

</td>
</tr>

<tr>
<td style="
background:#f7fafc;
padding:20px;
text-align:center;
font-size:12px;
color:#999;">

© 2026 HireMind AI

</td>
</tr>

</table>

</td>
</tr>

</table>

</body>
</html>
`;

    sendSmtpEmail.textContent = `
Welcome to HireMind AI

Your verification code is:

${otp}

This code expires in 5 minutes.
`;

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);

    console.log("✅ OTP Sent");
    console.log(response.body);

    return true;
  } catch (error) {
    console.error("Brevo API Error:");

    console.error(error.response?.body || error);

    throw new Error("Failed to send verification email.");
  }
};

export default sendOTP;
