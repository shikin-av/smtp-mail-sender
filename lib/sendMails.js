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
	rows = rows.filter(part => Array.isArray(part) && part.length)

	console.log('>>> MAILS ', rows)

	const begin = 1	// пропускаем строку с названием колонок
	for (let i = begin; i < rows.length; i++) {
	// 	sendEmail(
	// 		i,
	// 		{
	// 			from: mailOptions.from(),
	// 			to: rows[i][0],
	// 			subject: mailOptions.subject,
	// 			currentTemplate,
	// 			locals,
	// 			transporter,
	// 		},
	// 		sendingCallback
	// 	)
	// console.log(`>>> [${i}]: `, row)

	if (i !== 1) return	// TODO: REMOVE - вывод только 1го

	const { organization, role, fio } = emailsData
	sendEmail(
		i,
		{
			from: mailOptions.from(),
			to: 'shikin.a.v@mail.ru',	// TODO:
			subject: `${organization} | ${role} | ${fio}`,	// TODO:
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
