import axios from "axios";

const sendOTP = async (email, otp) => {
  try {
    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "HireMind AI",
          email: process.env.EMAIL_FROM,
        },
        to: [
          {
            email,
          },
        ],
        subject: `Your HireMind AI Verification Code - ${otp}`,
        htmlContent: `
          <h2>HireMind AI</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing:6px;">${otp}</h1>
          <p>This code expires in 5 minutes.</p>
        `,
        textContent: `Your OTP is ${otp}`,
      },
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": process.env.BREVO_API_KEY,
        },
      },
    );

    console.log("✅ OTP Sent");
  } catch (err) {
    console.error("Brevo API Error:", err.response?.data || err.message);
    throw new Error("Failed to send verification email.");
  }
};

export default sendOTP;
