const cheerio = require("cheerio");
const express = require("express");
const app = express();
const redis = require("redis");
const request = require("request");
require("dotenv/config");

const expressPort = process.env.PORT || 5000;
const redisPort = process.env.PORT || 6379;
const redisClient = redis.createClient(redisPort);

const redisListName = "covidDataBangladesh";

const cache = (req, res, next) => {
    redisClient.get(redisListName, (err, data) => {
        if (err) throw err;

        if (data !== null) {
            res.json(JSON.parse(data));
        } else {
            next();
        }
    });
};

app.get("/", cache, async (req, res) => {
    try {
        console.log(`Fetching new data, time: ${Date()}`);

        // Scrap information from source.
        request(
            { uri: process.env.DATA_SOURCE },
            function (err, response, body) {
                const $ = cheerio.load(body);

                let numberList = [];

                $(".info-box-number").each(function (i, el) {
                    numberList.push($(this).text().trim());
                });

                let covidData = {
                    allTime: {
                        labTest: numberList[0],
                        confirmedCases: numberList[1],
                        isolationCases: numberList[2],
                        recoveredCases: numberList[3],
                        deaths: numberList[4],
                    },
                    last24Hours: {
                        labTest: numberList[5],
                        confirmedCases: numberList[6],
                        isolationCases: numberList[7],
                        recoveredCases: numberList[8],
                        deaths: numberList[9],
                    },
                };

                redisClient.setex(
                    redisListName,
                    3600,
                    JSON.stringify(covidData)
                );

                res.json(covidData);
            }
        );
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
});

app.listen(expressPort, () =>
    console.log(`App up and running at ${expressPort}, time: ${Date()}`)
);
