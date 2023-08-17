const express = require('express'); // express module to create a server application
const cors = require('cors'); // cors module to handle Preflight requests
const bodyParser = require('body-parser'); // body-parser module to parse JSON objects
const fs = require('fs'); // fs library to read and write files

const app = express(); // instance of an Express object
const port = 3000; // the port the server will be listening on
const textBodyParser = bodyParser.text({ limit: '20mb', defaultCharset: 'utf-8'});

// import our custom modules here:
const { authenticateUser } = require('./my_modules/login.js');
const { getRandomInt, 
    getRouletteSlice, 
    readCsvFile, 
    parseObjToCsvString,
    getReward,
    addUser } = require('./my_modules/utility.js');

app.use(cors({
    origin: 'http://localhost:5000' // enable CORS for localhost:3000
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.options('/login', (req, res) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5000');
    res.header('Access-Control-Allow-Headers', 'task'); // Allow the 'task 'header
    res.header('Access-Control-Allow-Methods', 'GET'); // Allow the GET method
    res.header('Access-Control-Allow-Methods', 'POST'); // Allow the POST method
    res.sendStatus(200);
});

app.get('/login', textBodyParser, async function (req, res) {
    // print the HTTP Request Headers
    console.log('req.headers: ', req.headers); 

    const reqOrigin = req.headers['origin']; // get the origin of the request
    const reqTask = req.headers['task']; // get the task of the request

    console.log("Processing request from " + reqOrigin + " for route " + req.url + " with method " + req.method + " for task: " + reqTask);

    // TASK Check
    if (reqTask === 'login') {
        try {
            const loginResult = await authenticateUser(req);
            console.log('authenticateUser() result: ', loginResult);

            if (loginResult == true) {
                res.setHeader('Access-Control-Allow-Origin', '*');
                // allow client to access the custom 'request-result' header:
                res.setHeader('Access-Control-Expose-Headers', 'request-result'); 
                // set the custom header 'request-result'
                res.setHeader('request-result', 'Request ' + req.method + ' was received successfully.');
                res.status(200).send("Login Successful");
            } else {
                res.status(403).send("Login Failed"); // 403 Forbidden Access
            }
        } catch (error) {
            console.log('authenticateUser() error:', error);
            res.status(500).send("Server Error");
        }
    }

    res.end();
});

app.get('/home', async function (req, res) {
    // print the HTTP Request Headers
    console.log('req.headers: ', req.headers); 

    const reqOrigin = req.headers['origin']; // get the origin of the request
    const reqTask = req.headers['task']; // get the task of the request

    console.log("Processing request from " + reqOrigin + " for route " + req.url + " with method " + req.method + " for task: " + reqTask);

    // TASK Check
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
    // print the HTTP Request Headers
    console.log('req.headers: ', req.headers); 

    const reqOrigin = req.headers['origin']; // get the origin of the request
    const reqTask = req.headers['task']; // get the task of the request
    const reqBody = req.body; // get the request data

    console.log("Processing request from " + reqOrigin + " for route " + req.url + " with method " + req.method + " for task: " + reqTask);
    console.log("req.body: ", req.body);
    console.log("req.body.username: ", req.body.username);
    console.log("req.body.password: ", req.body.password);

    // TASK Check
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
    const result = req.body.result; // Obtener el resultado del juego (win o lose)
    const username = req.body.username; // Deberías obtener el nombre de usuario de la sesión actual

    // Leer el archivo users.json
    const fileData = fs.readFileSync('./data/users.json', 'utf8');
    let users = JSON.parse(fileData);

    if (users[username]) {
        if (result === "win") {
            users[username].tickets += 1; // Incrementar el número de tickets en caso de victoria
        } else if (result === "lose") {
            if (users[username].tickets > 0) {
                users[username].tickets -= 1; // Reducir el número de tickets en caso de derrota (si hay tickets disponibles)
            }
        }

        // Actualizar el archivo users.json con los nuevos datos
        fs.writeFileSync('./data/users.json', JSON.stringify(users, null, 2));

        res.send("Tickets actualizados");
    } else {
        res.status(404).send("Usuario no encontrado");
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
            console.error("Error al escribir en el archivo CSV: ", err);
            res.status(500).json({ error: "Error al escribir en el archivo CSV" });
        } else {
            console.log("Resultado de partida escrito en el archivo CSV");
            res.status(200).json({ message: "Resultado de partida escrito en el archivo CSV" });
        }
    });
});

// Initialize the Server, and Listen to connection requests
app.listen(port, (err) => {
    if (err) {
        console.log("There was a problem: ", err);
        return;
    }
    console.log(`Server listening on http://localhost:${port}`);
})