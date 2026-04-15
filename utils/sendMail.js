import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendOTP = async (email, otp) => {
  const msg = {
    to: email,
    from: process.env.EMAIL_FROM,
    subject: "HireMind AI - OTP Verification",

    // ✅ plain text
    text: `Your OTP is ${otp}. It is valid for 5 minutes.`,

    // ✅ HTML (IMPORTANT)
    html: `
      <div style="font-family: Arial; padding: 20px;">
        <h2>HireMind AI</h2>
        <p>Your verification code is:</p>
        <h1 style="color:#19ca09;">${otp}</h1>
        <p>This code will expire in 5 minutes.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("✅ OTP sent successfully");
  } catch (error) {
    console.error("❌ Email error:", error.response?.body || error.message);
    throw new Error("Email sending failed");
  }
};

export default sendOTP;
