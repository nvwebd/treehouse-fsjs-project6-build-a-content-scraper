"use strict";

const fs = require("fs");

const prepareErrorMsgForErrorLog = async (error) => {
  const utcDate = new Date().toUTCString();
  const completeError = `[${utcDate}] => ${JSON.stringify(error)}`;

  return Promise.resolve(completeError);
};

const appendToErrorFile = async error => {
  return new Promise((resolve, reject) => {
    fs.appendFile(`${__dirname}/../../logs/scraper-error.log`, `${error}\r\n`, err => {
      if (err) {
        console.error("Could not append error file");
        reject(err);
      } else {
        resolve(true);
      }
    });
  });
};

const checkIfLogFolderExists = async () => {
  if (!fs.existsSync("logs")) {
    return new Promise((resolve, reject) => {
      fs.mkdir("logs", 0o777, err => {
        if (err !== null) {
          console.log("Could not create the 'data' folder");
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  } else {
    return true;
  }
};

module.exports = {
  fullErrorLog: async (error) => {
    const logsFolderExists = await checkIfLogFolderExists();
    if (logsFolderExists) {
      const finishedError = await prepareErrorMsgForErrorLog(error);
      console.error(finishedError);
      console.log();
      await appendToErrorFile(finishedError);
      process.exit(-1);
    }
  }
};
