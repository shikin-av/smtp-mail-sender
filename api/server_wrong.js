const nodemailer = require('nodemailer'),
smtpTransport = require('nodemailer-smtp-transport'),
express = require('express'),
fs = require('fs'),
EmailTemplate = require('email-templates').EmailTemplate,
path = require('path'),
bodyParser = require('body-parser'),
urlencodedParser = bodyParser.urlencoded({ extended: false }),
csv = require('fast-csv'),
multiparty = require('multiparty'),
clientSessions = require("client-sessions"),
fsUtils = require("nodejs-fs-utils"),
CONFIG = require('../CONFIG.json')

const	app = express()

app.use(express.static(CONFIG.staticFolder))

console.log('HOST ', CONFIG.host)

const locals = {host: CONFIG.host}
let mailerStatus = 'Готов начать рассылку'
let templatesMail = []	// список шаблонов
let csvFiles = []	// список csv-файлов
let emails = []
let timeForOneSend = 1000 // интервал между отправками писем

const mailOptions = {
	fromForUserWatch: 'От меня',
	from: function(){
		return this.fromForUserWatch + ' <'+CONFIG.smtpUser+'>'
	},
    subject: 'Специально для Вас',
    emailTest: 'for.vds@yandex.ru',
    
}
 
const transporter = nodemailer.createTransport(
  smtpTransport({
    host: CONFIG.smtpHost,
    port: CONFIG.smtpPort,
    auth: {
        user: CONFIG.smtpUser,
        pass: CONFIG.smtpPass
    },
    /*connectionTimeout: 10000, 
    pool: true,
    rateLimit: true,
    maxMessages: 10 */
  })
)

app.use(clientSessions({ secret: CONFIG.secret }))

// количество файлов/папок в каталоге заносим в массив
// currentArr - массив шаблонов / csv-файлов
folderViewer = function(folder, csvFiles, callback){
	console.log('folder = ', folder)
	console.log('csvFiles = ', JSON.stringify(csvFiles))

	fs.readdir(folder, function(err, items) {
		for (let i=0; i<items.length; i++) { 
			if(csvFiles.length<items.length){
				csvFiles.push(items[i])
			}
		}  
		callback()  
	})
}
//**************************************************************************************
mailerGoSend = function(to){
	const i = -1
	const timeForOneSend = setInterval(function(){
	    
		if(i == to.length){
		    clearInterval(timeForOneSend)
		    mailerStatus = 'Отправка писем завершена'
		}else{
			// Рендер письма----------------------------------
		    currentTemplate.render(locals, function (err, result) {
		        i++
				if (err) {
				    return console.error(err)
				}
				transporter.sendMail({
				    from: mailOptions.from(),
				    to: to[i],
				    subject: mailOptions.subject,
				    html: result.html,
				    text: result.text
				}, function (error, info) {
				    if (error) {
				        return console.log(error)
				    }
				    console.log('------------------------------------------------------------------------')
				    console.log('Сообщение отправлено на адрес: ' + to[i] + '   ' + info.response)
				    
				})
			})
		    //-----------------------------------------------
		}
	}, timeForOneSend)
}
//-----------------------------------------------------------
mailerGoTest = function (to) {
    // Рендер письма
    currentTemplate.render(locals, function (err, result) {
        if (err) {
            return console.error(err)
        }
        transporter.sendMail({
            from: mailOptions.from(),
            to: to,
            subject: mailOptions.subject,
            html: result.html,
            text: result.text
        }, function (error, info) {
            if (error) {
                return console.log(error)
            }
            console.log('------------------------------------------------------------------------')
            console.log('Сообщение отправлено на адреса: ' + to + '   ' + info.response)
            mailerStatus = 'Отправка писем завершена'
        })
    })
}
//-----------------------------------------------------------

unique = function(arr) {	// удаление повторяющихся emails
  const tempObj = {}

  for (let i=0; i<arr.length; i++) {
    const strKey = arr[i]
    tempObj[strKey] = true // запомнить строку в виде свойства объекта
  }

  return Object.keys(tempObj) 	// массив ключей (емэйлов)
}


//**************************************************************************************
csvFilesCallback = function(){
	const fileFinished = 0	// для запуска unique() на последнем файле

	for(let i=0; i<csvFiles.length; i++){
		//проверка на расширение файла
		const curFileExtension = csvFiles[i].split('.')	// массив [имя, расширение]
		curFileExtension = curFileExtension[curFileExtension.length-1]	//расширение
		if(curFileExtension != 'csv'){
			console.log('Неверный формат файла ' + csvFiles[i])
			csvFiles.splice[i,1]
			continue
		}
		console.log('CSV файл:    ' + csvFiles[i])

		fs.createReadStream(__dirname + '/db/' + csvFiles[i])
			.pipe(csv())
			.on('data', function(data){
				emails.push(data)

			})
			.on('end', function(data){
				fileFinished++
				// выборка уникальных emails после прочтения последнего файла
				if(fileFinished==csvFiles.length){	
					emails = unique(emails)
					//mailOptions.to = emails	// обновляем список emailov

					console.log('Чтение из ' + csvFiles.length + ' файлов завершено. Всего ' + emails.length + ' адресов')
					console.log(emails)
				}
			
			})
	}
}
// читаем адреса из csv-файлов
folderViewer(`${__dirname}/../${CONFIG.dbFolder}`, csvFiles, csvFilesCallback)	


//-----шаблонизатор-------------------------------------------------
const templating = require('consolidate')
app.engine('hbs', templating.handlebars)
app.set('view engine', 'hbs')    
app.set('views', __dirname + '/templates')



//-------------------------------------------------------------------------------------------------
app.get('/', function (req, res) {
	if (req.session_state.username) {  
	  console.log('/')

	  folderViewer(`${__dirname}${CONFIG.mailTemplateFolder}`, templatesMail, () => {})	// смотрим сколько шаблонов

	  //------------------------------
	  if(mailerStatus == 'Нет email-адресов для рассылки. Загрузите файлы с адресами.' && emails != 0){
	  	  mailerStatus = 'Готов начать рассылку'
	  }
	  //------------------------------
	  
	  res.render('views/index', {
	      host: CONFIG.host, 
	      port: CONFIG.port,
	      templatesMail: templatesMail,
	      subject: mailOptions.subject,
	      emailTest: mailOptions.emailTest,
	      mailerStatus: mailerStatus,
	      from: mailOptions.fromForUserWatch
	  })
	}else{
		res.redirect('/login')
	}
})



app.post('/', urlencodedParser, function (req, res) {
    console.log('POST')

    if(req.body.type == 'changeTemplateAndSubject'){
	    if(req.body.selectedTemplate != null){
		  console.log('Выбран шаблон: ' + req.body.selectedTemplate)
		  // рендерим выбранный в select шаблон
		  res.render('email-templates/' + req.body.selectedTemplate + '/html', {
		      host: CONFIG.host, 
		      port: CONFIG.port,
		      templatesMail: templatesMail,
		      subject:mailOptions.subject,
		      emailTest:mailOptions.emailTest
		  })
		  templateDir = path.join(__dirname, 'templates', 'email-templates', req.body.selectedTemplate)
	      currentTemplate = new EmailTemplate(templateDir)
		}

		if(req.body.emailSubject != null){
	   		mailOptions.subject = req.body.emailSubject
	   		console.log('Тема письма: ' + req.body.emailSubject)
	   	}	
    }

    if(req.body.type == 'mailerGoSend'){
    	if(emails.length > 0){
	    	mailerStatus = 'Отправка почты'
	    	res.render('views/send', {mailerStatus: mailerStatus})
		  	console.log('Рассылка началась ..........................................................')
	    	mailerGoSend(emails)
	    }else{
	    	mailerStatus = 'Нет email-адресов для рассылки. Загрузите файлы с адресами.'
	    	res.render('views/send', {mailerStatus: mailerStatus})
	    }
    }

    if(req.body.type == 'mailerGoTest'){
    	mailerStatus = 'Отправка тестового письма'
    	res.render('views/send', {mailerStatus: mailerStatus})
	  	console.log('Тестовое письмо ..........................................................')
	  	mailOptions.emailTest = req.body.adress 
	  	mailerGoTest(req.body.adress)
    }

    if(req.body.type == 'getStatus'){
    	res.render('views/send', {mailerStatus: mailerStatus})
    	console.log('Проверка статуса')
    }

    if(req.body.type == 'setFrom'){
    	//mailOptions.from = req.body.from + ' <'+config.smtpUser+'>'	// "input От кого"
    	mailOptions.fromForUserWatch = req.body.from	// "input От кого"
    	console.log('От: ' + req.body.from)
    }
})

//**********************************************************
app.get('/emails', function (req, res) {
	if (req.session_state.username) {  
		res.render('views/emails', {host: CONFIG.host, emails_length: emails.length})
		console.log('/emails')
	}else{
		res.redirect('/login')
	}
})
//**********************************************************
app.post('/emails', urlencodedParser, function (req, res) {

	if(req.body.type == 'deleteAllcsvFiles'){
		fsUtils.emptyDir(`${__dirname}${CONFIG.dbFolder}`, function (err) {
			if(err){
				return console.error(err)
			}else{
				res.render('views/filesDeleted', {host: CONFIG.host})	
				emails = []
		}
	})

	}else{
		// загрузка файлов на сервер
		const form = new multiparty.Form({
			uploadDir:  `${__dirname}${CONFIG.dbFolder}`
		})
	    form.parse(req, function(err, fields, files) {
			if (err) {
				res.writeHead(400, {'content-type': 'text/plain'})	//!!!!!!!!!
				res.end("invalid request: " + err.message)
				return
			}
			console.log('Загруженные файлы: ')	
			for(let i = 0; i<files.upload.length; i++){
				console.log(files.upload[i].originalFilename)				
			}
			
	      	csvFiles = []
	    	
	    	folderViewer(`${__dirname}${CONFIG.dbFolder}`, csvFiles, csvFilesCallback)	// читаем адреса из csv-файлов
	      	res.render('views/filesUploaded', {host: CONFIG.host})	
	    })
	}    
})
//**********************************************************
app.get('/login', function (req, res) {
	res.render('views/login', {host: CONFIG.host, port:CONFIG.port})
	console.log('/login')
})
app.post('/login', urlencodedParser, function (req, res) {
	const login = req.body.login
	const pass = req.body.pass

	if(login == CONFIG.appUser && pass == CONFIG.appPass){
		req.session_state.username = login
		console.log('Login: ' + req.session_state.username)
		//res.redirect('/')
		res.send('corrected')
	}else{
		res.send('incorrected')
	}
})

app.get('/logout', function (req, res) {
	req.session_state.reset()
  	res.redirect('/login')
})



app.listen(CONFIG.port, function () {
  console.log(`Server Run on ${CONFIG.host}:${CONFIG.port}`)
})

 
 
