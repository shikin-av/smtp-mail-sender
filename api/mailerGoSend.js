const { MAIL_STATUS } = require('./constants')

const mailerGoSend = ({ 
	emails,
	locals,
	mailOptions, 
	transporter, 
	currentTemplate,
	successCallback,
  errorCallback,
}) => {
	console.log('@@@@@@ EMAILS ', emails)
	var i = -1
	var timeForOneSend = setInterval(() => {
		if(i == emails.length){
		    clearInterval(timeForOneSend);
		    mailerStatus = MAIL_STATUS.SENDING_COMPLETE
		}else{
			// Рендер письма
				currentTemplate.render(locals, (err, result) => {
					i++;
					if (err) {
						errorCallback(MAIL_STATUS.ERROR_TEMPLATE, err)
							return console.error(err)
					}
					transporter.sendMail({
							from: mailOptions.from(),
							to: emails[i],
							subject: mailOptions.subject,
							html: result.html,
							text: result.text
						}, (err, info) => {
								if (err) {
									errorCallback(MAIL_STATUS.ERROR_SENDING, err)
									return console.error('>>> ERROR mailerGoSend ошибка отправки ', err)
								}
								console.log('------------------------------------------------------------------------');
								console.log('Сообщение отправлено на адрес: ' + emails[i] + '   ' + info.response);
								successCallback(MAIL_STATUS.SENDING_COMPLETE);
						}
					);
				})
		}
	}, timeForOneSend);
}

module.exports = mailerGoSend
