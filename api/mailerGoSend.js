const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

const mailerGoSend = ({ 
	emails,	// [[any@mail.ru, 'some@mail.ru'], [...]]	// внутрненний массив - строка csv файла
	locals,
	mailOptions, 
	transporter, 
	currentTemplate,
}) => {
	emails = emails.filter(part => Array.isArray(part) && part.length)
	for (let email of emails) {
		// Рендер письма
		currentTemplate.render(locals, async (err, result) => {
			if (err) {
				console.error(`>>> ERROR currentTemplate.render error`, err)
				throw err
			}

			try {
				await delay(100)

				await transporter.sendMail({
					from: mailOptions.from(),
					to: email,
					subject: mailOptions.subject,
					html: result.html,
					text: result.text
				})
				console.log(`Письмо успешно отправлено на ${email}`)
			} catch(err) {
				console.error(`>>> ERROR Не удалось отправить письмо на  ${email}`, err);			
			}
		})
	}
}

module.exports = mailerGoSend
