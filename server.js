const nodemailer = require('nodemailer'),
smtpTransport = require('nodemailer-smtp-transport'),
express = require('express'),
fs = require('fs'),
EmailTemplate = require('email-templates').EmailTemplate,
path = require('path'),
bodyParser = require('body-parser'),
urlencodedParser = bodyParser.urlencoded({ extended: false }),
multiparty = require('multiparty'),
clientSessions = require("client-sessions"),
fsUtils = require("nodejs-fs-utils"),
CONFIG = require('./CONFIG.json'),
CONSTANTS = require('./lib/constants'),
mailerGoSend = require('./lib/mailerGoSend'),
mailerGoTest = require('./lib/mailerGoTest'),
folderViewer = require('./lib/folderViewer'),
csvFilesCallback = require('./lib/csvFilesCallback'),
setDefaultTemplate = require('./lib/setDefaultTemplate')

const { TYPE, MAIL_STATUS } = CONSTANTS
const	app = express()
app.use(express.static(`${__dirname}${CONFIG.staticFolder}`))

let mailerStatus = MAIL_STATUS.READY_FOR_SEND
let locals = {host: CONFIG.host}
let currentTemplate
let mailTemplates = []	// список шаблонов
let csvFiles = []	// список csv-файлов
let emails = []
let successfullySent = 0	 // успешно отправленных писем (текущая рассылка)

let mailOptions = {
	fromForUserWatch: 'От меня',	// TODO:
	from: function(){
		return this.fromForUserWatch + ' <'+CONFIG.smtpUser+'>';
	},
    subject: 'Специально для Вас',	// TODO:
    emailTest: CONFIG.emailTest,
}
 
let transporter = nodemailer.createTransport(
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

// читаем адреса из csv-файлов
folderViewer({
	folder: `${__dirname}${CONFIG.dbFolder}`,
	files: csvFiles,
	emails,
	callback: csvFilesCallback,
})	


// Шаблонизатор
let templating = require('consolidate');
app.engine('hbs', templating.handlebars);
app.set('view engine', 'hbs');    
app.set('views', __dirname + '/templates');

app.get('/', function (req, res) {
	if (req.session_state.username) {  
	  console.log('/');

		// смотрим сколько шаблонов
	  folderViewer({
			folder: `${__dirname}${CONFIG.mailTemplateFolder}`, 
			files: mailTemplates,
			emails,
			callback: () => {},	
		})

	  //------------------------------
	  if(mailerStatus == MAIL_STATUS.NO_EMAILS && emails != 0){
	  	  mailerStatus = MAIL_STATUS.READY_FOR_SEND;
	  }
	  //------------------------------
	  
	  res.render('views/index', {
	      host: CONFIG.host, 
	      port: CONFIG.port,
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

	console.log(`>>> TYPE: ${req.body.type}`)
	console.log(`>>> STATUS: ${mailerStatus}`)

	if(req.body.type == TYPE.CHANGE_TEMPLATE_AND_SUBJECT){
		console.log('Выбран шаблон: ' + templateName);
		// рендерим выбранный в select шаблон
		res.render('email-templates/' + templateName + '/html', {
				host: CONFIG.host,
				port: CONFIG.port,
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
	

	if(req.body.type == TYPE.MAILER_GO_SEND){
		if (!currentTemplate) {
			currentTemplate = setDefaultTemplate(mailTemplates)
		}

		if(emails.length > 0){
			mailerStatus = MAIL_STATUS.SENDING
			res.render('views/send', {mailerStatus})
			console.log('Рассылка началась ..........................................................')
			
			try {
				let num = 0
				await mailerGoSend({ 
					emails,
					locals,
					mailOptions, 
					transporter,
					currentTemplate,
				}, () => {
					num++
					mailerStatus = `Письма отправлены на ${num} адресов`
					if (num >= emails.length) {
						mailerStatus = `${MAIL_STATUS.SENDING_COMPLETE} на ${num} адресов`
					}
				})
			} catch(err) {
				mailerStatus = MAIL_STATUS.ERROR_SENDING
				console.error(`>>> ERROR Ошибка отправки`, err);			
			}
		}else{
			mailerStatus = MAIL_STATUS.NO_EMAILS;
			res.render('views/send', {mailerStatus})
		}
	}

	if(req.body.type == TYPE.MAILER_GO_TEST){
		if (!currentTemplate) {
			currentTemplate = setDefaultTemplate(mailTemplates)
		}

		mailerStatus = MAIL_STATUS.TEST_SENDING
		res.render('views/send', {mailerStatus})
		console.log('Тестовое письмо ..........................................................')
		mailOptions.emailTest = req.body.address
		
		try {
			await mailerGoTest({ 
				email: req.body.address, 
				locals, 
				mailOptions,
				transporter,
				currentTemplate,
			})	

			mailerStatus = MAIL_STATUS.SENDING_COMPLETE
			console.log(`Тестовое письмо УСПЕШНО оправлено на ${req.body.address}`);
		} catch(err) {
			mailerStatus = MAIL_STATUS.ERROR_SENDING
			console.error(`>>> ERROR Не удалось отправить письмо на тестовый ящик ${req.body.address}`, err);			
		}
	}

	if(req.body.type == TYPE.GET_STATUS){
		res.render('views/send', {mailerStatus});
		// console.log('####### Проверка статуса', mailerStatus);
	}

	if(req.body.type == TYPE.SET_FROM){
		//mailOptions.from = req.body.from + ' <'+config.smtpUser+'>';	// "input От кого"
		mailOptions.fromForUserWatch = req.body.from;	// "input От кого"
		console.log('От: ' + req.body.from);
	}
});

//**********************************************************
app.get('/emails', function (req, res) {
	if (req.session_state.username) {  
		res.render('views/emails', {host: CONFIG.host, emails_length: emails.length});
		console.log('/emails');
	}else{
		res.redirect('/login');
	}
});
//**********************************************************
app.post('/emails', urlencodedParser, function (req, res) {

	if(req.body.type == TYPE.DELETE_ALL_CSV_FILES){
		fsUtils.emptyDir(__dirname + '/db', function (err) {
			if(err){
				return console.error(err);
			}else{
				res.render('views/filesDeleted', {host: CONFIG.host});	
				emails = [];
		}
	});

	}else{
		// загрузка файлов на сервер
		let form = new multiparty.Form({
			uploadDir:  `${__dirname}${CONFIG.dbFolder}`
		})
		form.parse(req, function(err, fields, files) {
			if (err) {
				res.writeHead(400, {'content-type': 'text/plain'});	//!!!!!!!!!
				res.end("invalid request: " + err.message);
				return;
			}
			console.log('Загруженные файлы: ');	
			for(let i = 0; i<files.upload.length; i++){
				console.log(files.upload[i].originalFilename);				
			}
		
			csvFiles = [];
			
			folderViewer({
				folder: `${__dirname}${CONFIG.dbFolder}`, 
				files: csvFiles, 
				emails,
				callback: csvFilesCallback ,
			})	// читаем адреса из csv-файлов
				res.render('views/filesUploaded', {host: CONFIG.host});	
		});
	}    
});
//**********************************************************
app.get('/login', function (req, res) {
	res.render('views/login', {host: CONFIG.host, port:CONFIG.port});
	console.log('/login');
});
app.post('/login', urlencodedParser, function (req, res) {
	let login = req.body.login;
	let pass = req.body.pass;

	if(login == CONFIG.appUser && pass == CONFIG.appPass){
		req.session_state.username = login;
		console.log('Login: ' + req.session_state.username);
		//res.redirect('/');
		res.send('corrected');
	}else{
		res.send('incorrected');
	}
});

app.get('/logout', function (req, res) {
	req.session_state.reset();
  	res.redirect('/login');
});



app.listen(CONFIG.port, function () {
  console.log(`SERVER RUN ON ${CONFIG.host}:${CONFIG.port}`);
});

 
 
