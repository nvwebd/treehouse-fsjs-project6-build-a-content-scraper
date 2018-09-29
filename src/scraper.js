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
  return await scrapeIt("http://shirts4mike.com/shirts.php", {
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
    .then(({ data }) => {
      const allShirtsData = Promise.all(
        data.shirts.map(async shirt => {
          return await scrapeIt(`http://shirts4mike.com/${shirt.url}`, {
            price: ".price"
          })
            .then(({ data }) => {
              shirt.price = data.price;
              shirt.date = new Date();
              return Promise.resolve(shirt);
            })
            .catch(() => {
              errorLogger.fullErrorLog(
                "There’s been a 404 error. Cannot connect to http://shirts4mike.com."
              );
            });
        })
      );
      return Promise.resolve(allShirtsData);
    })
    .catch(() => {
      errorLogger.fullErrorLog(
        "There’s been a 404 error. Cannot connect to http://shirts4mike.com."
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
        delimiter: ";",
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
  }  else {
    errorLogger.fullErrorLog(
      new Error("Something went wrong when creating 'data' folder!"),
      "Maybe you have insufficient access to the folder / file"
    );
  }
})();
