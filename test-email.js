const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'chiwhakanpurin@gmail.com',
    pass: 'myubftnzsatyavtv',
  },
});

transporter.sendMail({
  from: 'chiwhakanpurin@gmail.com',
  to: 'chiwhakanpurin@gmail.com',
  subject: 'Test Email',
  text: 'Hello from Node.js!',
}, (err, info) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Success:', info.response);
  }
});
