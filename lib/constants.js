module.exports = {
  DEFAULT_MAIL_SUBJECT: 'Специально для Вас', // TODO: from CONFIG
  TYPE: {
    SENDING_MAILS: 'sendMails',
    SENDING_TEST_MAIL: 'sendTestMail',
    CHANGE_TEMPLATE_AND_SUBJECT: 'changeTemplateAndSubject',
    GET_STATUS: 'getStatus',
    SET_FROM: 'setFrom',
    DELETE_ALL_CSV_FILES: 'deleteAllcsvFiles',
  },
  MAIL_STATUS: {
    READY_FOR_SEND: 'Готов начать рассылку',
    SENDING_COMPLETE: 'Отправка писем завершена',
    NO_EMAILS: 'Нет email-адресов для рассылки. Загрузите файлы с адресами',
    SENDING: 'Отправка почты',
    TEST_SENDING: 'Отправка тестового письма',
    ERROR_SENDING: 'Ошибка отправки',
  }
}
