const fs = require('fs')

// читаем адреса из csv-файлов
// количество файлов/папок в каталоге заносим в массив
// currentArr - массив шаблонов / csv-файлов
const folderViewer = ({ folder, files, emails, callback }) => {
	fs.readdir(folder, (err, items) => {
		for (let i=0; i<items.length; i++) { 
			if(files.length<items.length){
				files.push(items[i])
			}
		}  
		callback({ csvFiles: files, emails })
	})
}

module.exports = folderViewer
