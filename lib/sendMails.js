const CONFIG = require('../CONFIG.json')

const sendMails = ({ 
		emailsData,  // строка после преобразования parseFileString
		locals,
		mailOptions, 
		transporter, 
		currentTemplate,
	}, 
	sendingCallback
) => {
	const begin = 1	// пропускаем строку с названием колонок
	for (let i = begin; i < emailsData.length; i++) {
		// if (i !== 1) return	// TODO: REMOVE - вывод только 1го

		const { organization, role, fio, emails } = emailsData[i]
		for (const email of emails) {
			const data = {
				from: mailOptions.from(),
				to: email,
				subject: `${organization} | ${role} | ${fio}`,	// TODO: mailOptions.subject
				currentTemplate,
				locals,
				transporter,
			}
			sendEmail(i, data, sendingCallback)
		}
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
