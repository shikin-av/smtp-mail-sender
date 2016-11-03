var nodemailer = require('nodemailer'),
	smtpTransport = require('nodemailer-smtp-transport'),
	express = require('express'),
	request = require('request'),
	fs = require('fs'),
	EmailTemplate = require('email-templates').EmailTemplate,
	path = require('path'),
	bodyParser = require('body-parser'),
	urlencodedParser = bodyParser.urlencoded({ extended: false }),
	csv = require('fast-csv'),
	multiparty = require('multiparty'),
	http = require('http'),
	util = require('util'),
	clientSessions = require("client-sessions"),
	fsUtils = require("nodejs-fs-utils");
	//	config = require('./config');	 
	 
//app.use(express.logger());
	 
var	config = {
      	host: process.env.HOSTNAME,
      	port: process.env.PORT,
  		smtpHost: 'mail.nic.ru',
  		smtpPort: 25,
  		smtpUser: 'mailertest@interstudio.club',
  		smtpPass: '79XHA9wQK//LZ',
      	mailTemplateFolder: __dirname + '/templates/email-templates',
      	dbFolder: __dirname + '/db',
      	appUser: 'mailer',
      	appPass: '123'
	}

var	app = express();

app.use(express.static(__dirname + '/static'));

//------------------------------------------------------------------
var mailerStatus = 'Готов начать рассылку';
var locals = {host: config.host}
var templatesMail = [];	// список шаблонов
var csvFiles = [];	// список csv-файлов
var emails = [];

var mailOptions = {
	fromForUserWatch: 'От меня',
	from: function(){
		return this.fromForUserWatch + ' <'+config.smtpUser+'>';
	},
    subject: 'Специально для Вас',
    emailTest: 'for.vds@yandex.ru',
    
};
/*console.log('fromForUserWatch: ' + mailOptions.fromForUserWatch);
console.log('from: ' + mailOptions.from());*/
 
var transporter = nodemailer.createTransport(
  smtpTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    auth: {
        user: config.smtpUser,
        pass: config.smtpPass
    },
    connectionTimeout: 10000, 
    pool: true,
    rateLimit: true,
    maxMessages: 10 
  })
);

app.use(clientSessions({
  secret: '0GBlJZ9EKBt2Zbi2flRPvztczCewBxXK'
}));

// передается в folderViewer(), когда калбэк не нужен
emptyFunction = function(){
	return false;
}
// количество файлов/папок в каталоге заносим в массив
// currentArr - массив шаблонов / csv-файлов
folderViewer = function(folder, currentArr, callback){
	fs.readdir(folder, function(err, items) {
		for (var i=0; i<items.length; i++) { 
			if(currentArr.length<items.length){
				currentArr.push(items[i]);
			}
		}  
		callback();  
	});
}
//**************************************************************************************
mailerGoSend = function(to){
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
    }, function(error, info){
      if(error){
          return console.log(error);
      }
      console.log('------------------------------------------------------------------------');
      console.log('Сообщение отправлено на адреса: ' + to + '   ' + info.response);
      mailerStatus = 'Отправка писем завершена';
    });
  });
}

unique = function(arr) {	// удаление повторяющихся emails
  var tempObj = {};

  for (var i=0; i<arr.length; i++) {
    var strKey = arr[i];
    tempObj[strKey] = true; // запомнить строку в виде свойства объекта
  }

  return Object.keys(tempObj); 	// массив ключей (емэйлов)
}


//**************************************************************************************
csvFilesCallback = function(){
	var fileFinished = 0;	// для запуска unique() на последнем файле

	for(var i=0; i<csvFiles.length; i++){
		//проверка на расширение файла
		var curFileExtension = csvFiles[i].split('.');	// массив [имя, расширение]
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
folderViewer(config.dbFolder, csvFiles, csvFilesCallback);	
//-----------------------------------------------------------------

//------------------------------------------------------------------

//-----шаблонизатор-------------------------------------------------
var templating = require('consolidate');
app.engine('hbs', templating.handlebars);
app.set('view engine', 'hbs');    
app.set('views', __dirname + '/templates');



//-------------------------------------------------------------------------------------------------
app.get('/', function (req, res) {
	if (req.session_state.username) {  
	  console.log('/');

	  folderViewer(config.mailTemplateFolder, templatesMail, emptyFunction);	// смотрим сколько шаблонов
	  
	  res.render('views/index', {
	      host: config.host, 
	      port: config.port,
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

    if(req.body.type == 'changeTemplateAndSubject'){
	    if(req.body.selectedTemplate != null){
		  console.log('Выбран шаблон: ' + req.body.selectedTemplate);
		  // рендерим выбранный в select шаблон
		  res.render('email-templates/' + req.body.selectedTemplate + '/html', {
		      host: config.host, 
		      port: config.port,
		      templatesMail: templatesMail,
		      subject:mailOptions.subject,
		      emailTest:mailOptions.emailTest
		  });
		  templateDir = path.join(__dirname, 'templates', 'email-templates', req.body.selectedTemplate);
	      currentTemplate = new EmailTemplate(templateDir);
		}

		if(req.body.emailSubject != null){
	   		mailOptions.subject = req.body.emailSubject;
	   		console.log('Тема письма: ' + req.body.emailSubject);
	   	}	
    }

    if(req.body.type == 'mailerGoSend'){
    	if(emails.length > 0){
	    	mailerStatus = 'Отправка почты';
	    	res.render('views/send', {mailerStatus: mailerStatus});
		  	console.log('Рассылка началась ..........................................................');
	    	mailerGoSend(emails);
	    }else{
	    	mailerStatus = 'Нет email-адресов для рассылки. Загрузите файлы с адресами.';
	    	res.render('views/send', {mailerStatus: mailerStatus});
	    }
    }

    if(req.body.type == 'mailerGoTest'){
    	mailerStatus = 'Отправка тестового письма';
    	res.render('views/send', {mailerStatus: mailerStatus});
	  	console.log('Тестовое письмо ..........................................................');
	  	mailOptions.emailTest = req.body.adress; 
	  	mailerGoSend(req.body.adress);	  	
    }

    if(req.body.type == 'getStatus'){
    	res.render('views/send', {mailerStatus: mailerStatus});
    	console.log('Проверка статуса');
    }

    if(req.body.type == 'setFrom'){
    	//mailOptions.from = req.body.from + ' <'+config.smtpUser+'>';	// "input От кого"
    	mailOptions.fromForUserWatch = req.body.from;	// "input От кого"
    	console.log('От: ' + req.body.from);
    }
});

//**********************************************************
app.get('/emails', function (req, res) {
	if (req.session_state.username) {  
		res.render('views/emails', {host: config.host, emails_length: emails.length});
		console.log('/emails');
	}else{
		res.redirect('/login');
	}
});
//**********************************************************
app.post('/emails', urlencodedParser, function (req, res) {

	if(req.body.type == 'deleteAllcsvFiles'){
		fsUtils.emptyDir(__dirname + '/db', function (err) {
			if(err){
				return console.error(err);
			}else{
				res.render('views/filesDeleted', {host: config.host});	
				emails = [];
		}
	});

	}else{
		// загрузка файлов на сервер
		var form = new multiparty.Form({
			uploadDir:  config.dbFolder
		});
	    form.parse(req, function(err, fields, files) {
			if (err) {
				res.writeHead(400, {'content-type': 'text/plain'});	//!!!!!!!!!
				res.end("invalid request: " + err.message);
				return;
			}
			console.log('Загруженные файлы: ');	
			for(var i = 0; i<files.upload.length; i++){
				console.log(files.upload[i].originalFilename);				
			}
			
	      	csvFiles = [];
	    	
	    	folderViewer(config.dbFolder, csvFiles, csvFilesCallback);	// читаем адреса из csv-файлов
	      	res.render('views/filesUploaded', {host: config.host});	
	    });
	}    
});
//**********************************************************
app.get('/login', function (req, res) {
	res.render('views/login', {host: config.host, port:config.port});
	console.log('/login');
});
app.post('/login', urlencodedParser, function (req, res) {
	var login = req.body.login;
	var pass = req.body.pass;

	if(login == config.appUser && pass == config.appPass){
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




app.listen(config.port, function () {
  console.log('Server Run');
});

 
 
