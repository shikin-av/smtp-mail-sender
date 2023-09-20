const nodemailer = require('nodemailer'),
smtpTransport = require('nodemailer-smtp-transport'),
express = require('express'),
EmailTemplate = require('email-templates').EmailTemplate,
path = require('path'),
bodyParser = require('body-parser'),
urlencodedParser = bodyParser.urlencoded({ extended: false }),
multiparty = require('multiparty'),
clientSessions = require("client-sessions"),
fsUtils = require("nodejs-fs-utils"),
CONFIG = require('./CONFIG.json'),
CONSTANTS = require('./lib/constants'),
sendMails = require('./lib/sendMails'),
sendTestMail = require('./lib/sendTestMail'),
folderViewer = require('./lib/folderViewer'),
csvFilesCallback = require('./lib/csvFilesCallback'),
setDefaultTemplate = require('./lib/setDefaultTemplate')

const { TYPE, MAIL_STATUS } = CONSTANTS
const	app = express()
app.use(express.static(`${__dirname}${CONFIG.STATIC_FOLDER}`))

let mailerStatus = MAIL_STATUS.READY_FOR_SEND
let locals = {host: CONFIG.HOST}
let currentTemplate
let mailTemplates = []	// список шаблонов
let csvFiles = []				// список csv-файлов
let emails = []

let mailOptions = {
	fromForUserWatch: CONFIG.DEFAULT_FROM,
	from() {
		return this.fromForUserWatch + ' <'+CONFIG.SMTP_USER+'>';
	},
	subject: CONFIG.DEFAULT_SUBJECT,
	emailTest: CONFIG.TEST_EMAIL,
}
 
let transporter = nodemailer.createTransport(
  smtpTransport({
    host: CONFIG.SMTP_HOST,
    port: CONFIG.SMTP_PORT,
    auth: {
        user: CONFIG.SMTP_USER,
        pass: CONFIG.SMTP_PASSWORD
    },
    /*connectionTimeout: 10000, 
    pool: true,
    rateLimit: true,
    maxMessages: 10 */
  })
)

app.use(clientSessions({ secret: CONFIG.SECRET }))

// читаем адреса из csv-файлов
folderViewer({
	folder: `${__dirname}${CONFIG.CSV_FOLDER}`,
	files: csvFiles,
	emails,
	callback: csvFilesCallback,
})	


// Шаблонизатор
const templating = require('consolidate')
app.engine('hbs', templating.handlebars)
app.set('view engine', 'hbs')
app.set('views', __dirname + '/templates')

app.get('/', (req, res) => {
	if (req.session_state.username) {  
		// смотрим сколько шаблонов
	  folderViewer({
			folder: `${__dirname}${CONFIG.MAIL_TEMPLATE_FOLDER}`, 
			files: mailTemplates,
			emails,
			callback: () => {},	
		})

	  if(mailerStatus == MAIL_STATUS.NO_EMAILS && emails != 0){
	  	  mailerStatus = MAIL_STATUS.READY_FOR_SEND
	  }
	  
	  res.render('views/index', {
	      host: CONFIG.HOST, 
	      port: CONFIG.PORT,
	      mailTemplates,
	      subject: mailOptions.subject,
	      emailTest: mailOptions.emailTest,
	      mailerStatus,
	      from: mailOptions.fromForUserWatch
	  });
	}else{
		res.redirect('/login');
	}
});

app.post('/', urlencodedParser, async (req, res) => {
	let templateName = req.body.selectedTemplate
		? req.body.selectedTemplate
		: 'hello'

	if(req.body.type == TYPE.CHANGE_TEMPLATE_AND_SUBJECT){
		console.log('Выбран шаблон: ' + templateName);
		// рендерим выбранный в select шаблон
		res.render('email-templates/' + templateName + '/html', {
				host: CONFIG.HOST,
				port: CONFIG.PORT,
				templatesMail: mailTemplates,
				subject:mailOptions.subject,
				emailTest:mailOptions.emailTest
		})

		// инициализация currentTemplate
		templateDir = path.join(__dirname, 'templates', 'email-templates', templateName)
		currentTemplate = new EmailTemplate(templateDir)


		if(!!req.body.emailSubject){
			mailOptions.subject = req.body.emailSubject;
			console.log('Тема письма: ' + req.body.emailSubject);
		} else {
			console.log('>>> ERROR Тема письма ', req.body.emailSubject)
		}
	}
	

	if(req.body.type == TYPE.SENDING_MAILS){
		if (!currentTemplate) {
			currentTemplate = setDefaultTemplate(mailTemplates)
		}

		if(emails.length > 0){
			mailerStatus = MAIL_STATUS.SENDING
			res.render('views/send', {mailerStatus})
			console.log('Рассылка началась ..........................................................')
			
			try {
				let num = 0
				await sendMails({ 
					emailsData: emails,
					locals,
					mailOptions, 
					transporter,
					currentTemplate,
				}, () => {
					num++
					mailerStatus = `Письма отправлены на ${num} / ${emails.length} адресов`
					console.log(`======= Письма отправлены на ${num}/${emails.length} адресов`)
					if (num >= emails.length) {
						mailerStatus = `${MAIL_STATUS.SENDING_COMPLETE} на ${num}/${emails.length} адресов`
					}
				})
			} catch(err) {
				mailerStatus = MAIL_STATUS.ERROR_SENDING
				console.error(`>>> ERROR Ошибка отправки`, err)	
			}
		}else{
			mailerStatus = MAIL_STATUS.NO_EMAILS;
			res.render('views/send', { mailerStatus })
		}
	}

	if(req.body.type == TYPE.SENDING_TEST_MAIL){
		if (!currentTemplate) {
			currentTemplate = setDefaultTemplate(mailTemplates)
		}

		mailerStatus = MAIL_STATUS.TEST_SENDING
		res.render('views/send', { mailerStatus })
		console.log('Тестовое письмо ..........................................................')
		mailOptions.emailTest = req.body.address
		
		try {
			await sendTestMail({ 
				email: req.body.address, 
				locals, 
				mailOptions,
				transporter,
				currentTemplate,
			})	

			mailerStatus = MAIL_STATUS.SENDING_COMPLETE
			console.log(`Тестовое письмо УСПЕШНО оправлено на ${req.body.address}`)
		} catch (err) {
			mailerStatus = MAIL_STATUS.ERROR_SENDING
			console.error(`>>> ERROR Не удалось отправить письмо на тестовый ящик ${req.body.address}`, err)	
		}
	}

	if(req.body.type == TYPE.GET_STATUS){
		res.render('views/send', { mailerStatus })
	}

	if(req.body.type == TYPE.SET_FROM){
		//mailOptions.from = req.body.from + ' <'+CONFIG.SMTP_USER+'>';	// "input От кого"
		mailOptions.fromForUserWatch = req.body.from	// "input От кого"
		console.log('От: ' + req.body.from)
	}
})

app.get('/emails', (req, res) => {
	if (req.session_state.username) {  
		res.render('views/emails', { host: CONFIG.HOST, emails_length: emails.length })
		console.log('/emails')
	} else {
		res.redirect('/login')
	}
})

app.post('/emails', urlencodedParser, (req, res) => {

	if(req.body.type == TYPE.DELETE_ALL_CSV_FILES){
		fsUtils.emptyDir(__dirname + '/db', err => {
			if(err){
				return console.error(err)
			}else{
				res.render('views/filesDeleted', { host: CONFIG.HOST })
				emails = []
		}
	})
	}else{
		// загрузка файлов на сервер
		let form = new multiparty.Form({
			uploadDir:  `${__dirname}${CONFIG.CSV_FOLDER}`
		})
		form.parse(req, (err, fields, files) => {
			if (err) {
				res.writeHead(400, { 'content-type': 'text/plain' })
				res.end("invalid request: " + err.message);
				return;
			}
			console.log('Загруженные файлы: ');	
			for(let i = 0; i<files.upload.length; i++){
				console.log(files.upload[i].originalFilename)			
			}
		
			csvFiles = [];
			
			folderViewer({
				folder: `${__dirname}${CONFIG.CSV_FOLDER}`, 
				files: csvFiles, 
				emails,
				callback: csvFilesCallback ,
			})	// читаем адреса из csv-файлов
				res.render('views/filesUploaded', { host: CONFIG.HOST })
		})
	}    
})

app.get('/login', (req, res) => {
	res.render('views/login', { host: CONFIG.HOST, port: CONFIG.PORT })
	console.log('/login')
})
app.post('/login', urlencodedParser, (req, res) => {
	let login = req.body.login
	let pass = req.body.pass

	if(login == CONFIG.LOGIN && pass == CONFIG.PASSWORD){
		req.session_state.username = login
		console.log('Login: ' + req.session_state.username)
		//res.redirect('/')
		res.send('corrected')
	}else{
		res.send('incorrected')
	}
})

app.get('/logout', (req, res) => {
	req.session_state.reset()
  	res.redirect('/login')
})

app.listen(CONFIG.PORT, () => {
  console.log(`SERVER RUN ON ${CONFIG.HOST}:${CONFIG.PORT}`)
})

 
 
