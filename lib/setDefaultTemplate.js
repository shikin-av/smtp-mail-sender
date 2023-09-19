const path = require('path')
const EmailTemplate = require('email-templates').EmailTemplate
const CONFIG = require('../CONFIG.json')
const folderViewer = require('./folderViewer')

const setDefaultTemplate = mailTemplates => {
  let currentTemplate
	folderViewer({
		folder: `${__dirname}/../${CONFIG.mailTemplateFolder}`, 
		files: mailTemplates,
		emails: [],
		callback: ({ csvFiles, emails: [] }) => {
			mailTemplates = csvFiles	// TODO: исправить именование csvFiles коллбэка на files
			console.log('>>> setDefaultTemplate mailTemplates ', mailTemplates)

			try {
				const templateDir = path.join(`${__dirname}${CONFIG.mailTemplateFolder}/${mailTemplates[0]}`)
				currentTemplate = new EmailTemplate(templateDir)
				console.log('>>> setDefaultTemplate currentTemplate ', currentTemplate)

        return currentTemplate
			} catch (err) {
				console.error('>>> ERROR setDefaultTemplate ', err)
        return null
			}
		}
	})
}

module.exports = setDefaultTemplate
