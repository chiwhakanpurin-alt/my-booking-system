const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function main() {
  try {
    console.log('Sending from:', process.env.GMAIL_USER);
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: process.env.GMAIL_USER,
      subject: "Test email from Nodemailer",
      text: "Hello world"
    });
    console.log("Message sent: %s", info.messageId);
  } catch (err) {
    console.error("Error occurred:");
    console.error(err);
  }
}
main();
