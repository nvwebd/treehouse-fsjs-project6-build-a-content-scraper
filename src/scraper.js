"use strict";

const fs = require("fs");
const scrapeIt = require("scrape-it");
const csv = require("csv");
const errorLogger = require("./modules/errorLogger");

const createDataFolderIfNotExisting = () => {
  if (!fs.existsSync("data")) {
    return new Promise((resolve, reject) => {
      fs.mkdir("data", 0o777, err => {
        if (err !== null) {
          errorLogger.fullErrorLog(err);
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

const buildCSVObject = async () => {
  const connectUrl = "http://shirts4mike.com";
  return await scrapeIt(`${connectUrl}/shirts.php`, {
    shirts: {
      listItem: ".products li a",
      data: {
        title: {
          selector: "img",
          attr: "alt"
        },
        url: {
          attr: "href"
        },
        imgUrl: {
          selector: "img",
          attr: "src"
        }
      }
    }
  })
    .then(({ data, response }) => {
      return new Promise((resolve, reject) => {
        if (response.statusCode === 200) {
          const allShirtsData = Promise.all(
            data.shirts.map(async shirt => {
              return await scrapeIt(`${connectUrl}/${shirt.url}`, {
                price: ".price"
              })
                .then(({ data, response }) => {
                  return new Promise((resolve, reject) => {
                    if (response.statusCode === 200) {
                      shirt.price = data.price;
                      shirt.date = new Date();
                      resolve(shirt);
                    } else {
                      reject({
                        errCode: response.statusCode,
                        errMessage: response.statusMessage
                      });
                    }
                  });
                })
                .catch(err => {
                  errorLogger.fullErrorLog(
                    `There’s been a ${err.errCode} error. ${
                      err.errMessage
                    } with URL: ${connectUrl}`
                  );
                });
            })
          );
          resolve(allShirtsData);
        } else {
          reject({
            errCode: response.statusCode,
            errMessage: response.statusMessage
          });
        }
      });
    })
    .catch(err => {
      errorLogger.fullErrorLog(
        `There’s been a ${err.errCode} error. ${err.errMessage} with URL: ${connectUrl}`
      );
    });
};

const createCSV = async shirts => {
  return new Promise((resolve, reject) => {
    csv.stringify(
      shirts,
      {
        header: true,
        columns: {
          title: "Title",
          price: "Price",
          imgUrl: "ImageURL",
          url: "URL",
          date: "Time"
        },
        formatters: {
          date: value => value.toISOString()
        }
      },
      (err, output) => {
        if (err) {
          errorLogger.fullErrorLog(
            "Something went wrong with the CSV creation"
          );
          reject(err);
        } else {
          resolve(output);
        }
      }
    );
  });
};

const buildCurrentDateForCSVFilename = () => {
  const fullYear = new Date().getFullYear();
  const month = new Date().getMonth();
  const day = new Date().getDate();

  return Promise.resolve(`${fullYear}-${month}-${day}`);
};

const writeCSVtoDataFolder = async csvString => {
  const getCurrentDate = await buildCurrentDateForCSVFilename();

  return await new Promise((resolve, reject) => {
    fs.writeFile(
      `${__dirname}/../data/${getCurrentDate}.csv`,
      csvString,
      err => {
        if (err) {
          errorLogger.fullErrorLog("Failed creating the CSV file");
          reject(err);
        } else {
          resolve(true);
        }
      }
    );
  });
};

(async () => {
  const dataFolderStatus = await createDataFolderIfNotExisting();

  if (dataFolderStatus) {
    const shirts = await buildCSVObject();
    const csvString = await createCSV(shirts);

    writeCSVtoDataFolder(csvString)
      .then(() => {
        process.exit(0);
      })
      .catch(err => {
        errorLogger.fullErrorLog("Couldn't write CSV file to data folder");
      });
  } else {
    errorLogger.fullErrorLog(
      new Error("Something went wrong when creating 'data' folder!"),
      "Maybe you have insufficient access to the folder / file"
    );
  }
})();
