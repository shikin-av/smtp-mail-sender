const { MAIL_STATUS } = require('./constants')

const mailerGoTest = ({ 
  email, 
  locals, 
  mailOptions, 
  transporter, 
  currentTemplate,
  successCallback,
  errorCallback,
}) => {
  // Рендер письма
    currentTemplate.render(locals, (err, result) => {
      if (err) {
        errorCallback(MAIL_STATUS.ERROR_TEMPLATE, err)
        return console.error(err)
      }
      transporter.sendMail({
        from: mailOptions.from(),
        to: email,
        subject: mailOptions.subject,
        html: result.html,
        text: result.text
      }, (err, info) => {
        if (err) {
          errorCallback(MAIL_STATUS.ERROR_SENDING, err)
          return console.log('>>>>>>> SENDING ERROR: ', err)          
        }
        console.log('------------------------------------------------------------------------');
        console.log(`Тестовое сообщение отправлено на адрес:  ${email}  ${info.response}`)
        successCallback(MAIL_STATUS.SENDING_COMPLETE);
      })
    })
}

module.exports = mailerGoTest