let nodemailer = require('nodemailer'),
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
CONFIG = require('./CONFIG.json'),
mailerGoSend = require('./api/mailerGoSend'),
mailerGoTest = require('./api/mailerGoTest'),
folderViewer = require('./api/folderViewer')
const { TYPE, MAIL_STATUS } = require('./api/constants')

const	app = express()
app.use(express.static(__dirname + '/static'))

let mailerStatus = MAIL_STATUS.READY_FOR_SEND
let locals = {host: CONFIG.host}
let templatesMail = []	// список шаблонов
let csvFiles = []	// список csv-файлов
let emails = []
let timeForOneSend = 1000 // интервал между отправками писем	

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


//-----------------------------------------------------------

unique = function(arr) {	// удаление повторяющихся emails
  let tempObj = {};

  for (let i=0; i<arr.length; i++) {
    let strKey = arr[i];
    tempObj[strKey] = true; // запомнить строку в виде свойства объекта
  }

  return Object.keys(tempObj); 	// массив ключей (емэйлов)
}


//**************************************************************************************
csvFilesCallback = function(){
	let fileFinished = 0;	// для запуска unique() на последнем файле

	for(let i=0; i<csvFiles.length; i++){
		//проверка на расширение файла
		let curFileExtension = csvFiles[i].split('.');	// массив [имя, расширение]
		curFileExtension = curFileExtension[curFileExtension.length-1];	//расширение
		if(curFileExtension != 'csv'){
			console.log('Неверный формат файла ' + csvFiles[i]);
			csvFiles.splice[i,1];
			continue;
		}
		console.log('CSV файл:    ' + csvFiles[i]);

		fs.createReadStream(__dirname + '/db/' + csvFiles[i])
			.pipe(csv())
			.on('data', function(data){
				emails.push(data);

			})
			.on('end', function(data){
				fileFinished++;
				// выборка уникальных emails после прочтения последнего файла
				if(fileFinished==csvFiles.length){	
					emails = unique(emails);
					//mailOptions.to = emails;	// обновляем список emailov

					console.log('Чтение из ' + csvFiles.length + ' файлов завершено. Всего ' + emails.length + ' адресов');
					console.log(emails);
				}
			
			});
	}
}
// читаем адреса из csv-файлов
folderViewer(`${__dirname}${CONFIG.dbFolder}`, csvFiles, csvFilesCallback);	


//-----шаблонизатор-------------------------------------------------
let templating = require('consolidate');
app.engine('hbs', templating.handlebars);
app.set('view engine', 'hbs');    
app.set('views', __dirname + '/templates');



//-------------------------------------------------------------------------------------------------
app.get('/', function (req, res) {
	if (req.session_state.username) {  
	  console.log('/');

	  folderViewer(`${__dirname}${CONFIG. mailTemplateFolder}`, templatesMail, () => {});	// смотрим сколько шаблонов

	  //------------------------------
	  if(mailerStatus == MAIL_STATUS.NO_EMAILS && emails != 0){
	  	  mailerStatus = MAIL_STATUS.READY_FOR_SEND;
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
	  });
	}else{
		res.redirect('/login');
	}
});



app.post('/', urlencodedParser, function (req, res) {
    console.log('POST');

    if(req.body.type == TYPE.CHANGE_TEMPLATE_AND_SUBJECT){
	    if(req.body.selectedTemplate != null){
		  console.log('Выбран шаблон: ' + req.body.selectedTemplate);
		  // рендерим выбранный в select шаблон
		  res.render('email-templates/' + req.body.selectedTemplate + '/html', {
		      host: CONFIG.host, 
		      port: CONFIG.port,
		      templatesMail: templatesMail,
		      subject:mailOptions.subject,
		      emailTest:mailOptions.emailTest
		  });
		  templateDir = path.join(__dirname, 'templates', 'email-templates', req.body.selectedTemplate);
	      currentTemplate = new EmailTemplate(templateDir);
				console.log('>>> currentTemplate = ', currentTemplate)
		}

		if(req.body.emailSubject != null){
	   		mailOptions.subject = req.body.emailSubject;
	   		console.log('Тема письма: ' + req.body.emailSubject);
	   	}	
    }

    if(req.body.type == TYPE.MAILER_GO_SEND){
    	if(emails.length > 0){
	    	mailerStatus = MAIL_STATUS.SENDING
	    	res.render('views/send', {mailerStatus: mailerStatus})
		  	console.log('Рассылка началась ..........................................................')
				console.log('>>> currentTemplate = ', currentTemplate)
	    	mailerGoSend({ 
					emails, 
					mailOptions, 
					mailerStatus, 
					transporter,
					currentTemplate,
				})
	    }else{
	    	mailerStatus = MAIL_STATUS.NO_EMAILS;
	    	res.render('views/send', {mailerStatus: mailerStatus})
	    }
    }

    if(req.body.type == TYPE.MAILER_GO_TEST){
    	mailerStatus = MAIL_STATUS.TEST_SENDING
    	res.render('views/send', {mailerStatus: mailerStatus})
	  	console.log('Тестовое письмо ..........................................................')
			console.log('>>> currentTemplate = ', currentTemplate)
	  	mailOptions.emailTest = req.body.address
	  	mailerGoTest({ 
				to: req.body.address, 
				locals, 
				mailOptions, 
				mailerStatus, 
				transporter,
				currentTemplate,
			})
    }

    if(req.body.type == TYPE.GET_STATUS){
    	res.render('views/send', {mailerStatus: mailerStatus});
    	console.log('Проверка статуса');
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
		});
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
	    	
	    	folderViewer(`${__dirname}${CONFIG.dbFolder}`, csvFiles, csvFilesCallback);	// читаем адреса из csv-файлов
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

 
 
