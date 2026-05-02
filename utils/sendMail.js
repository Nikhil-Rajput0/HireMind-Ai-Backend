import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendOTP = async (email, otp, userName) => {
  const msg = {
    to: email,
    from: {
      email: process.env.EMAIL_FROM, // Your verified sender
      name: "HireMind AI",
    },
    replyTo: process.env.EMAIL_FROM, // Add reply-to for trust
    subject: `Your HireMind AI Verification Code - ${otp}`,

    // Plain text version - CRITICAL for avoiding spam
    text: `Hello${userName ? " " + userName : ""},

          Welcome to HireMind AI!

          Your verification code is: ${otp}

          This code will expire in 5 minutes. Enter it on the verification page to complete your account setup.

          If you didn't request this code, you can safely ignore this email. No account will be created without verification.

          Best regards,
          The HireMind AI Team`,

    // HTML version - Clean and professional
    html: `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f7fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
          
          <!-- Main Container -->
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            
            <!-- Header -->
            <tr>
              <td style="background-color: #15803d; padding: 30px 40px; border-radius: 12px 12px 0 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
                      HireMind AI
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 40px;">
                <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin: 0 0 10px;">
                  Hello${userName ? " " + userName : ""},
                </p>
                
                <p style="color: #2d3748; font-size: 16px; line-height: 1.6; margin: 0 0 25px;">
                  Thank you for signing up for HireMind AI. To complete your registration, please use the verification code below:
                </p>

                <!-- OTP Code Box -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                  <tr>
                    <td style="background-color: #f0fdf4; border: 2px solid #22c55e; border-radius: 10px; padding: 25px; text-align: center;">
                      <p style="color: #166534; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 12px;">
                        Verification Code
                      </p>
                      <p style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 700; color: #15803d; letter-spacing: 8px; margin: 0;">
                        ${otp}
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Expiry Notice -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                  <tr>
                    <td style="padding: 15px; background-color: #fefce8; border: 1px solid #fde047; border-radius: 8px;">
                      <p style="color: #854d0e; font-size: 14px; margin: 0; line-height: 1.5;">
                        ⏰ This verification code will expire in <strong>5 minutes</strong>. If it expires, you can request a new one on the verification page.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 40px;">
                    <hr style="border: 1px solid #e2e8f0; margin: 0;">
                  </td>
                </tr>

                <!-- Footer Info -->
                <tr>
                  <td style="padding: 30px 40px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="color: #718096; font-size: 13px; line-height: 1.5; margin: 0 0 10px;">
                            <strong>Didn't request this?</strong>
                          </p>
                          <p style="color: #a0aec0; font-size: 13px; line-height: 1.5; margin: 0;">
                            If you didn't create an account with HireMind AI, please ignore this email. No account will be created without verification.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f7fafc; padding: 25px 40px; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color: #a0aec0; font-size: 12px; line-height: 1.6;">
                      <p style="margin: 0;">
                        &copy; 2026 HireMind AI. All rights reserved.
                      </p>
                      <p style="margin: 5px 0 0;">
                        This is an automated message from HireMind AI. Please do not reply to this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,

    // Headers for better deliverability
    headers: {
      "X-Priority": "1",
      Precedence: "bulk",
    },

    // Mail settings
    mailSettings: {
      sandboxMode: {
        enable: false,
      },
    },

    // Tracking settings
    trackingSettings: {
      clickTracking: {
        enable: true,
        enableText: false,
      },
      openTracking: {
        enable: true,
      },
      subscriptionTracking: {
        enable: false,
      },
    },
  };

  try {
    await sgMail.send(msg);
    console.log("✅ OTP sent successfully to:", email);
    return { success: true };
  } catch (error) {
    console.error("❌ SendGrid Error:", error.response?.body || error.message);

    // Check for specific errors
    if (error.response?.body?.errors) {
      console.error(
        "SendGrid Errors:",
        JSON.stringify(error.response.body.errors, null, 2),
      );
    }

    throw new Error("Failed to send verification email. Please try again.");
  }
};

export default sendOTP;
