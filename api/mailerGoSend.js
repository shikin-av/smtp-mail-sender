const mailerGoSend = (to, MAIL_OPTIONS, mailerStatus) => {
	var i = -1
	var timeForOneSend = setInterval(function(){
		if(i == to.length){
		    clearInterval(timeForOneSend);
		    mailerStatus = 'Отправка писем завершена'
		}else{
			// Рендер письма----------------------------------
		    currentTemplate.render(locals, (err, result) => {
					i++;
					if (err) {
							return console.error(err)
					}
					transporter.sendMail({
							from: MAIL_OPTIONS.from(),
							to: to[i],
							subject: MAIL_OPTIONS.subject,
							html: result.html,
							text: result.text
					}, (error, info) => {
							if (error) {
									return console.log(error);
							}
							console.log('------------------------------------------------------------------------');
							console.log('Сообщение отправлено на адрес: ' + to[i] + '   ' + info.response);
					}
				);
			});
		}
	}, timeForOneSend);
}

module.exports = mailerGoSend
