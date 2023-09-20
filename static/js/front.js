var statusTimerMSeconds = 1000; // 5 сек

changeTemplate = function(){
    var selectedTemplate = $('#templatesMail').val();
    var emailSubject = $('#emailSubject').val();
    var type = 'changeTemplateAndSubject';
    $.ajax({
        type: "POST",
        url: location.protocol + '//' + document.domain + ':' + location.port,
        data: {
            type:type,
            selectedTemplate:selectedTemplate,
            emailSubject:emailSubject
        }, 
        dataType: "html",
        success: function (data) {
            $('.templatePreview').html(data);
        }
    });
}

setFrom = function(){   // от кого
    var from = $('#from').val();
    var type = 'setFrom';
    $.ajax({
        type: "POST",
        url: location.protocol + '//' + document.domain + ':' + location.port,
        data: {
            type:type,
            from:from
        }, 
        dataType: "html",
        success: function (data) {
            //$('.templatePreview').html(data);
        }
    });
}

getStatus = function(){
    type = 'getStatus';
    var statusTimerGo = setInterval(function(){
        $.ajax({
            type: "POST",
            url: location.protocol + '//' + document.domain + ':' + location.port,
            data: {
                type:type
            },
            dataType: "html",
            success: function (data) {
                $('.status').html(data);
                
                console.log('проверка статуса');

                var currentStatus = $('.statusText').text();
                if(currentStatus == 'Отправка писем завершена'){
                    clearInterval(statusTimerGo);
                    setTimeout(function(){
                        $('.statusText').html('Готов начать рассылку');
                        $("#btnsendMails").prop('disabled', false); 
                    }, statusTimerMSeconds);
                }
            }
        });
    }, statusTimerMSeconds);
}

sendMails = function(type){
    let address
    if(type == 'sendTestMail'){
        address = $('#emailTest').val();
    }else{
        address = '';
        $("#btnsendMails").prop('disabled', true); 
    }
    $.ajax({
        type: "POST",
        url: location.protocol + '//' + document.domain + ':' + location.port,
        data: {
            type:type,
            address:address
        },
        dataType: "html",
        success: function (data) {
            $('.status').html(data);
            getStatus();
        }
    });
}

userLogin = function(){
    var login = $('#login').val();
    var pass = $('#pass').val();
    if( login == "" || pass == ""){
        $('#responce').html('<h4 class="red">Заполнены не все поля</h4>');
    }else{
        

        $.ajax({
            type: "POST",
            url: location.protocol + '//' + document.domain + ':' + location.port + '/login',
            data: {
                login:login,
                pass:pass
            },
            dataType: "html",
            success: function (data) {          
                if(data=='incorrected'){
                    $('#responce').html('<h4 class="red">Неверный логин или пароль</h4>');  
                }else if(data=='corrected'){
                   location=location.protocol + '//' + document.domain + ':' + location.port;
                }

            }
        });   
    }
}



$(document).ready(function(){
    changeTemplate();   
});

// выбор из select
$('#templatesMail').change(function(){ 
    changeTemplate(); 
});





//---------------------------------------------------------------------------------------------------------------------------------------------------
//неактивность кнопки "загрузить файлы на сервер"
$("#uploadBtn").prop('disabled', true);
// узнаем количество выбранных файлов (для загрузки на сервер)
$('#uploadFile').on('change', function(){
    if(this.files.length<1){
        $("#uploadBtn").prop('disabled', true); 
    }else{
        $("#uploadBtn").prop('disabled', false);
    }
    //проверка расширения файла
    for(var i=0; i<this.files.length; i++){
        console.log(this.files[i].name);

        var curFileExtension = this.files[i].name.split('.');  // массив [имя, расширение]
        curFileExtension = curFileExtension[curFileExtension.length-1]; //расширение

        if(curFileExtension != 'csv'){
            alert('Неверный формат файла ' + this.files[i].name);
            $("#uploadBtn").prop('disabled', true); 
            continue;
        }
    }

});

$('#btnLogin').on('click', function(){
    userLogin();
    console.log('userLogin()');
});

$('#deleteAllFilesBtn').on('click', function(){
    var type = 'deleteAllcsvFiles';
    $.ajax({
        type: "POST",
        url: location.protocol + '//' + document.domain + ':' + location.port + '/emails',
        data: {
            type:type
        },
        dataType: "html",
        success: function (data) {
           $(document.body).html(data);
        }
    });
});