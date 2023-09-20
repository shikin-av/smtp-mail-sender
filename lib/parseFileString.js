// row = [['первая строка', 'some@mail.ru'], [...]]	// внутрненний массив - строка csv файла
const parseFileString = row => { 
  const [firstStr, ...restEmails] = row
	const [organization, role, fio, firstEmail] = firstStr.split(';')
  const emails = [firstEmail, ...restEmails]

	console.log(`====================================`)
	console.log(`  organization ${organization}`)
	console.log(`  role ${role}`)
	console.log(`  fio ${fio}`)
	console.log(`  emails ${emails}`)

  return {
    organization,
    role,
    fio,
    emails,
  }
}

module.exports = parseFileString
