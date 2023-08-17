const { parse } = require("csv-parse"); // import csv-parse into a 'parse' object
const fs = require('fs'); // import fs module

async function addUser(filePath, username, password) {
    return new Promise((resolve, reject) => {
        const fileData = fs.readFileSync(filePath);
        let users;

        try {
            users = JSON.parse(fileData);
        } catch (error) {
            users = {};
            reject(error);
        }

        if (!users[username]) {
            users[username] = {
                password: password,
                balance: 10,
                tickets: 10
            };

            fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
            console.log(`User ${username} was added to users.json`);
        } else {
            console.log(`Username ${username} already exists!`);
        }

        resolve();

    });
}

async function readCsvFile(file) {
    return new Promise((resolve, reject) => {
        const results = [];

        const input = fs.createReadStream(file);
        input
            .pipe(parse({ delimiter: ',' }))
            .on('data', function (dataRow) {
                // Data row received from the parse object
                // DEBUG: console print to check dataRow variable
                console.log('Data row: ', dataRow);
                // add dataRow to the results array:
                results.push(dataRow);
            })
            .on('end', function() {
                // End of parsing
                // console print to check the results array:
                console.log('Read CSV file results:');
                console.log(results);
                // resolve Promise 
                // with the parsed data in the results array
                resolve(results);
            }).on('error', function(err) {
                // Reject the Promise with the error
                reject(err);
            });
    });
}

async function parseObjToCsvString(data) {
    // convert an array into a string:
    let csvString = data.map(row => row.join(',')).join('\n');
    console.log(csvString);
    return csvString;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min * 1)) + min;
}

function getRouletteSlice(deg) {
    let slice = 1;

    if (!deg || typeof(deg) != 'number' || deg < 0 || deg > 360) {
        console.log("Invalid degree value in getRouletteSlice(): " + deg + " typeof(deg): " + typeof(deg));
        slice = 1;
        return;
    } else {
        switch(true) {
            case (deg >= 0 && deg <= 90):
                 // the degree is between 0 and 90
                 slice = 1;
                 break;
            case (deg >= 91 && deg <= 180):
                // the degree is between 91 and 180
                slice = 2;
                break;
            case (deg >= 181 && deg <= 270):
                // the degree is between 181 and 270
                slice = 3;
                break;
            case (deg >= 271 && deg <= 360):
                // the degree is between 271 and 360
                slice = 4;
                break;
            default:
                // some other degree ?
                console.log("default case in switch of getRouletteSlice() triggered");
                slice = 1;
                break;
        } 
    }

    return slice;
}

function getReward(slice, rewardData) {
    let reward = 0;

    if (!slice || typeof(slice) != 'number' || slice < 1 || slice > 4) {
        console.log("Invalid slice value in getReward(): " + slice + " typeof(slice): " + typeof(slice));
        reward = 0;
        return;
    } else {
        switch(slice) {
            case 1:
                 // its slice 1
                 reward = rewardData[1][2];
                 break;
            case 2:
                // its slice 2
                reward = rewardData[2][2];
                break;
            case 3:
                // its slice 3
                reward = rewardData[3][2];
                break;
            case 4:
                // its slice 4
                reward = rewardData[4][2];
                break;
            default:
                // some other slice ?
                console.log("default case in switch of getReward() triggered");
                reward = 0;
                break;
        } 
    }

    return reward;
}

module.exports = {
    getRandomInt, 
    getRouletteSlice, 
    readCsvFile, 
    parseObjToCsvString, 
    getReward,
    addUser
};