export const maskPhone = (phone = '') => {
  const cleaned = String(phone || '').replace(/\D/g, '');
  if (cleaned.length < 6) return phone;
  return `+91-${cleaned.slice(0, 3)}-***-**${cleaned.slice(-2)}`;
};

export const maskEmail = (email = '') => {
  const parts = String(email || '').split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
};

export const sendTransferOtp = async ({ channel, to, otp }) => {
  const message = `Your Bhumi transfer OTP is ${otp}. It expires in 10 minutes.`;

  if (channel === 'email') {
    console.log(`[Bhumi OTP] Sending transfer OTP to email ${to}: ${message}`);
    return { success: true, sentTo: to };
  }

  if (channel === 'sms') {
    console.log(`[Bhumi OTP] Sending transfer OTP to SMS ${to}: ${message}`);
    return { success: true, sentTo: to };
  }

  return { success: false, message: 'Unsupported OTP channel' };
};
