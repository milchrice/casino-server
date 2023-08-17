const express = require('express'); 
const cors = require('cors'); 
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express(); 
const port = 3000; 
const textBodyParser = bodyParser.text({ limit: '20mb', defaultCharset: 'utf-8'});

const { authenticateUser } = require('./my_modules/login.js');
const { getRandomInt, 
    getRouletteSlice, 
    readCsvFile, 
    getReward,
    addUser } = require('./my_modules/utility.js');

app.use(cors({
    origin: 'http://localhost:5000' 
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.options('/login', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5000');
    res.header('Access-Control-Allow-Headers', 'task'); 
    res.header('Access-Control-Allow-Methods', 'GET'); 
    res.header('Access-Control-Allow-Methods', 'POST'); 
    res.sendStatus(200);
});

app.get('/login', textBodyParser, async function (req, res) {

    console.log('req.headers: ', req.headers); 

    const reqOrigin = req.headers['origin'];
    const reqTask = req.headers['task']; 

    console.log("Processing request from " + reqOrigin + " for route " + req.url + " with method " + req.method + " for task: " + reqTask);

    if (reqTask === 'login') {
        try {
            const loginResult = await authenticateUser(req);
            console.log('authenticateUser() result: ', loginResult);

            if (loginResult == true) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Expose-Headers', 'request-result'); 
                res.setHeader('request-result', 'Request ' + req.method + ' was received successfully.');
                res.status(200).send("Login Successful");
            } else {
                res.status(403).send("Login Failed");
            }
        } catch (error) {
            console.log('authenticateUser() error:', error);
            res.status(500).send("Server Error");
        }
    }

    res.end();
});

app.get('/home', async function (req, res) {
    console.log('req.headers: ', req.headers); 

    const reqOrigin = req.headers['origin'];
    const reqTask = req.headers['task'];

    console.log("Processing request from " + reqOrigin + " for route " + req.url + " with method " + req.method + " for task: " + reqTask);

    if (reqTask === 'spin-btn') {
        try {
            // get a degree between 0 and 360 at random:
            const rotation = getRandomInt(0, 360);
            console.log("getRandomInt() returned rotation: ", rotation); 
            const slice = getRouletteSlice(rotation);
            console.log("getRouletteSlice() returned slice: ", slice); 

            // readCsvFile returns an array of arrays with the data from the .csv
            const csvFileData = await readCsvFile('./data/roulette-rewards.csv');
            console.log('readCsvFile() returned csvFileData: ', csvFileData);

            const reward = getReward(slice, csvFileData);
            console.log('getReward() returned reward: ', reward);

            // prepare and send the response to the client:
            res.setHeader('Access-Control-Allow-Origin', '*');
            // allow client to access the custom 'request-result' header:
            res.setHeader('Access-Control-Expose-Headers', 'request-result'); 
            // set the custom header 'request-result'
            res.setHeader('request-result', 'Request ' + req.method + ' was received successfully.');
            res.status(200).json({ rotation, reward });
        } catch (error) {
            console.log('There was a problem responding with a rotation: ', error);
            res.status(500).send("Server Error");
        }
    }
    
});

app.post('/login', async function (req, res) {
    console.log('req.headers: ', req.headers); 

    const reqOrigin = req.headers['origin']; 
    const reqTask = req.headers['task']; 
    const reqBody = req.body; 

    console.log("Processing request from " + reqOrigin + " for route " + req.url + " with method " + req.method + " for task: " + reqTask);
    console.log("req.body: ", req.body);
    console.log("req.body.username: ", req.body.username);
    console.log("req.body.password: ", req.body.password);

    if (reqTask === 'signup') {
        try {
            const filePath = './data/users.json';
            const username = reqBody.username;
            const password = reqBody.password;
            await addUser(filePath, username, password);

        } catch (error) {
            console.log('There was a problem responding with a rotation: ', error);
            res.status(500).send("Server Error");
        }
    }

});

app.post('/updateTickets', (req, res) => {
    const result = req.body.result; 
    const username = req.body.username;

    const fileData = fs.readFileSync('./data/users.json', 'utf8');
    let users = JSON.parse(fileData);

    if (users[username]) {
        if (result === "win") {
            users[username].tickets += 1; 
        } else if (result === "lose") {
            if (users[username].tickets > 0) {
                users[username].tickets -= 1; 
            }
        }

        fs.writeFileSync('./data/users.json', JSON.stringify(users, null, 2));

        res.send("Updated Tickets");
    } else {
        res.status(404).send("Useer not found");
    }
});

app.get('/getUsersData', (req, res) => {
    fs.readFile('./data/users.json', 'utf8', (err, data) => {
        if (err) {
            res.status(500).send("Server error");
            return;
        }

        const usersData = JSON.parse(data);
        res.json(usersData);
    });
});

app.post('/writeGameResult', (req, res) => {
    const { date, time, result } = req.body;

    const csvLine = `${date},${time},${result}\n`;

    fs.appendFile('./data/blackjack.csv', csvLine, (err) => {
        if (err) {
            console.error("Error writing the CSV: ", err);
            res.status(500).json({ error: "Error writing the CSV" });
        } else {
            console.log("Game result CSV");
            res.status(200).json({ message: "Game result CSV" });
        }
    });
});

app.get('/getGameResults', (req, res) => {
    fs.readFile('./data/blackjack.csv', 'utf8', (err, data) => {
        if (err) {
            res.status(500).send("Server error");
            return;
        }

        const lines = data.split('\n');
        const gameResults = [];

        for (const line of lines) {
            const [date, time, result] = line.split(',');
            gameResults.push({ date, time, result });
        }

        res.json(gameResults);
    });
});


//DICE GAME----------------------
app.get('/getDiceRewards', (req, res) => {
    fs.readFile('./data/dice-rewards.csv', 'utf8', (err, data) => {
        if (err) {
            res.status(500).send("Server error");
            return;
        }

        const rewardsArray = data.split('\n').slice(1);
        const rewardsData = rewardsArray.map(line => {
            const [number, reward] = line.split(', ');
            return { number: parseInt(number), reward: parseInt(reward) };
        });

        res.json(rewardsData);
    });
});

app.post('/updateUserTickets', (req, res) => {
    const username = "test"; 
    const newTickets = req.body.tickets;
    
    const fileData = fs.readFileSync('./data/users.json', 'utf8');
    let users = JSON.parse(fileData);
  
    if (users[username]) {

        users[username].tickets = newTickets;
  
        fs.writeFileSync('./data/users.json', JSON.stringify(users, null, 2));
  
        res.send("Tickets updated");
    } else {
        res.status(404).send("User not found");
    }
});

// Initialize the Server, and Listen to connection requests
app.listen(port, (err) => {
    if (err) {
        console.log("There was a problem: ", err);
        return;
    }
    console.log(`Server listening on http://localhost:${port}`);
})