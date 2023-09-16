const fs = require('fs')

// количество файлов/папок в каталоге заносим в массив
// currentArr - массив шаблонов / csv-файлов
const folderViewer = (folder, csvFiles, callback) => {
	fs.readdir(folder, function(err, items) {
		for (let i=0; i<items.length; i++) { 
			if(csvFiles.length<items.length){
				csvFiles.push(items[i])
			}
		}  
		callback()
	})
}

module.exports = folderViewer
