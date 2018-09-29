"use strict";

const fs = require("fs");

const prepareErrorMsgForErrorLog = async (error, customMessage) => {
  const fullError = {
    details: customMessage,
    errorStack: error || new Error(customMessage)
  };

  const utcDate = new Date().toUTCString();
  const completeError = `[${utcDate}] => ${JSON.stringify(fullError)}`;

  return Promise.resolve(completeError);
};

const appendToErrorFile = async error => {
  fs.appendFile(`${__dirname}/../../logs/scraper-error.log`, `${error}\r\n`, err => {
    if (err) {
      this.fullErrorLog(err, "Could not append error file");
    }
  });
};

const checkIfLogFolderExists = async () => {
  if (!fs.existsSync("logs")) {
    fs.mkdir("logs", 0o777, err => {
      if (err === null) {
        this.fullErrorLog(err, "Could not create the 'data' folder");
        return err;
      }
    });
  } else {
    return true;
  }
};

module.exports = {
  fullErrorLog: async (error, customMessage) => {
    const logsFolderExists = await checkIfLogFolderExists();
    if (logsFolderExists) {
      const finishedError = await prepareErrorMsgForErrorLog(error, customMessage);
      console.error(finishedError);
      appendToErrorFile(finishedError);
    }
  }
};
