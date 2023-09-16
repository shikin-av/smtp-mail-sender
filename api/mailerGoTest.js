const { MAIL_STATUS } = require('./constants')

const mailerGoTest = ({ 
  to, 
  locals, 
  mailOptions, 
  mailerStatus, 
  transporter, 
  currentTemplate, 
}) => {
  // Рендер письма
  currentTemplate.render(locals, (err, result) => {
      if (err) {
          return console.error(err)
      }
      transporter.sendMail({
          from: mailOptions.from(),
          to: to,
          subject: mailOptions.subject,
          html: result.html,
          text: result.text
      }, (error, info) => {
          if (error) {
              return console.log(error)
          }
          console.log('------------------------------------------------------------------------');
          console.log(`Сообщение отправлено на адреса:  ${to}  ${info.response}`);
          mailerStatus = MAIL_STATUS.SENDING_COMPLETE;
      });
  });
}

module.exports = mailerGoTest