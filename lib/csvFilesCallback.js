const unique = require('./unique')
const fs = require('fs')
const csv = require('fast-csv')
const CONFIG = require('../CONFIG.json')

// используется в folderViewer
const csvFilesCallback = ({ csvFiles, emails }) => {
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

		fs.createReadStream(`${__dirname}/../${CONFIG.DB_FOLDER}/${csvFiles[i]}`)
			.pipe(csv())
			.on('data', (data) => {
				emails.push(data)

			})
			.on('end', (data) => {
				fileFinished++;
				// выборка уникальных emails после прочтения последнего файла
				if(fileFinished==csvFiles.length){	
					emails = unique(emails)
					//mailOptions.to = emails;	// обновляем список emailov

					console.log('Чтение из ' + csvFiles.length + ' файлов завершено. Всего ' + emails.length + ' адресов');
					console.log(emails)
				}
			
			}
    )
	}
}

module.exports = csvFilesCallback
