// удаление повторяющихся emails
const unique = (arr) => {
  let tempObj = {}

  for (let i=0; i<arr.length; i++) {
    let strKey = arr[i]
    tempObj[strKey] = true // запомнить строку в виде свойства объекта
  }

  return Object.keys(tempObj) 	// массив ключей (емэйлов)
}

module.exports = unique
