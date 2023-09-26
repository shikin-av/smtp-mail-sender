const { MAIL_STATUS } = require('./constants')

const sendTestMail = async ({
  email, 
  locals, 
  mailOptions, 
  transporter, 
  currentTemplate,
}) => {
  // Рендер письма
  currentTemplate.render({
    ...locals, 
    fio: 'Тестовое ФИО',
    role: 'Тестовая должность',
	  organization: 'Тестовая организация',
  }, async (err, result) => {
    if (err) throw err
    
    await transporter.sendMail({
      from: mailOptions.from(),
      to: email,
      subject: mailOptions.subject,
      html: result.html,
      text: result.text
    })
  })
}

module.exports = sendTestMail