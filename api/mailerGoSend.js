const { MAIL_STATUS } = require('./constants')

const mailerGoSend = ({ 
	to, 
	mailOptions, 
	mailerStatus, 
	transporter, 
	currentTemplate 
}) => {
	var i = -1
	var timeForOneSend = setInterval(() => {
		if(i == to.length){
		    clearInterval(timeForOneSend);
		    mailerStatus = MAIL_STATUS.SENDING_COMPLETE
		}else{
			// Рендер письма
			try {
				currentTemplate.render(locals, (err, result) => {
					i++;
					if (err) {
							return console.error(err)
					}
					transporter.sendMail({
							from: mailOptions.from(),
							to: to[i],
							subject: mailOptions.subject,
							html: result.html,
							text: result.text
						}, (error, info) => {
								if (error) {
										return console.error('>>> ERROR mailerGoSend transporter.sendMail ', err)
								}
								console.log('------------------------------------------------------------------------');
								console.log('Сообщение отправлено на адрес: ' + to[i] + '   ' + info.response);
						}
					);
				})
			} catch (err) {
				console.error('>>> ERROR mailerGoSend render template ', err)
			}
		}
	}, timeForOneSend);
}

module.exports = mailerGoSend
