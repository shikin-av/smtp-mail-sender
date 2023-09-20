const CONFIG = require('../CONFIG.json')

const sendMails = ({ 
		emails,	// [[any@mail.ru, 'some@mail.ru'], [...]]	// внутрненний массив - строка csv файла
		locals,
		mailOptions, 
		transporter, 
		currentTemplate,
	}, 
	sendingCallback
) => {
	emails = emails.filter(part => Array.isArray(part) && part.length)

	console.log('>>> MAILS ', emails)

	for (let i = 0; i < emails.length; i++) {
		sendEmail(
			i,
			{
				from: mailOptions.from(),
				to: emails[i][0],
				subject: mailOptions.subject,
				currentTemplate,
				locals,
				transporter,
			},
			sendingCallback
		)
	}
}

const sendEmail = (
	timeoutMultiplier = 0,
	{
		from,
		to,
		subject,
		currentTemplate,
		locals,
		transporter,
	},
	sendingCallback = () => {},
) => {
	setTimeout(() => {
		currentTemplate.render(locals, async (err, result) => {	 // Рендер письма
			if (err) console.error(`>>> ERROR currentTemplate.render error`, err)

			try {
				await transporter.sendMail({
					from,
					to,
					subject,
					html: result.html,
					text: result.text
				})
				sendingCallback()
				
				console.log(`Письмо успешно отправлено на ${to}`)
			} catch(err) {
				console.error(`>>> ERROR Не удалось отправить письмо на  ${to}`, err);			
			}
		})
	}, CONFIG.SENDING_DELAY * timeoutMultiplier)
} 

module.exports = sendMails
