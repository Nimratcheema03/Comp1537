const express = require("express");
const session = require("express-session");
const app = express();
const fs = require("fs");
const { JSDOM } = require('jsdom');

// static path mappings
app.use("/js", express.static("public/js"));
app.use("/css", express.static("public/css"));
app.use("/img", express.static("public/imgs"));
app.use("/fonts", express.static("public/fonts"));
app.use("/html", express.static("public/html"));
app.use("/media", express.static("public/media"));


app.use(session({
    secret: "extra text that no one will guess",
    name: "wazaSessionID",
    resave: false,
    saveUninitialized: true
}));



app.get("/", function(req, res) {

    if (req.session.loggedIn) {
        res.redirect("/myrecepies");
    } else {

        let doc = fs.readFileSync("./app/html/CookFavourite.html", "utf8");

        res.set("Server", "Wazubi Engine");
        res.set("X-Powered-By", "Wazubi");
        res.send(doc);

    }

});


app.get("/myrecepies", function(req, res) {

    // check for a session first!
    if (req.session.loggedIn) {

        let profile = fs.readFileSync("./app/html/myrecepies.html", "utf8");
        let profileDOM = new JSDOM(profile);



        const mysql = require("mysql2");
        const connection = mysql.createConnection({
            host: "localhost",
            user: "root",
            password: "",
            database: "cooking"
        });
        connection.connect();
        connection.query(
            //'SELECT * FROM user',
            "SELECT * FROM recepies",
            function(error, results, fields) {
                // results is an array of records, in JSON format
                // fields contains extra meta data about results
                console.log("Results from DB", results, "and the # of records returned", results.length);

                if (error) {
                    // in production, you'd really want to send an email to admin but for now, just console
                    console.log(error);
                }
                const t2 = profileDOM.window.document.getElementById("table");


                for (let i = 0; i < results.length; i++) {
                    let str = "<tr> <td>" + results[i].names + "</td> <td>" + results[i].ingredient1 + "</td> <td>" + results[i].ingredient2 + "</td> <td>" + results[i].ingredient3 + "</td> <td>" + results[i].ingredient4 + "</td> <td>" + results[i].ingredient5 + "</td></tr>";

                    t2.innerHTML += str;



                };
               


                profileDOM.window.document.body.appendChild(t2);
                //profileDOM.window.document.getElementsByTagId("table")[0].innerHTML = req.session.results
                profileDOM.window.document.getElementsByTagName("title")[0].innerHTML = req.session.name + "'s Profile";
                profileDOM.window.document.getElementById("username").innerHTML = "Welcome back " + req.session.name;
                profileDOM.window.document.getElementById("id1").innerHTML = "Email : " + req.session.email;
                profileDOM.window.document.getElementById("id2").innerHTML = "Password : " + req.session.password;
                profileDOM.window.document.getElementById("id3").innerHTML = "Age : " + req.session.age;
                profileDOM.window.document.getElementById("id4").innerHTML = "Profession : " + req.session.profession;
                profileDOM.window.document.getElementById("id5").innerHTML = "Address : " + req.session.address;


                res.set("Server", "Wazubi Engine");
                res.set("X-Powered-By", "Wazubi");

                res.send(profileDOM.serialize());
            }
        );



    } else {

        res.redirect("/");
    }

});



app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Notice that this is a "POST"
app.post("/login", function(req, res) {
    res.setHeader("Content-Type", "application/json");


    console.log("What was sent", req.body.email, req.body.password);


    let results = authenticate(req.body.email, req.body.password,
        function(userRecord) {
            //console.log(rows);
            if (userRecord == null) {
                // server couldn't find that, so use AJAX response and inform
                // the user. when we get success, we will do a complete page
                // change. Ask why we would do this in lecture/lab :)
                res.send({ status: "fail", msg: "User account not found." });
            } else {
                // authenticate the user, create a session
                req.session.loggedIn = true;
                req.session.email = userRecord.email;
                req.session.name = userRecord.name;
                req.session.age = userRecord.age;
                req.session.profession = userRecord.profession;
                req.session.address= userRecord.address;
                req.session.password = userRecord.password;
                req.session.save(function(err) {
                    // session saved, for analytics, we could record this in a DB
                });
                // all we are doing as a server is telling the client that they
                // are logged in, it is up to them to switch to the profile page
                res.send({ status: "success", msg: "Logged in." });
            }
        });

});

app.get("/logout", function(req, res) {

    if (req.session) {
        req.session.destroy(function(error) {
            if (error) {
                res.status(400).send("Unable to log out")
            } else {
                // session deleted, redirect to home
                res.redirect("/");
            }
        });
    }
});

function authenticate(email, pwd, callback) {

    const mysql = require("mysql2");
    const connection = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "cooking"
    });
    connection.connect();
    connection.query(
        //'SELECT * FROM user',
        "SELECT * FROM user WHERE email = ? AND password = ?", [email, pwd],
        function(error, results, fields) {
            // results is an array of records, in JSON format
            // fields contains extra meta data about results
            console.log("Results from DB", results, "and the # of records returned", results.length);

            if (error) {
                // in production, you'd really want to send an email to admin but for now, just console
                console.log(error);
            }
            if (results.length > 0) {
                // email and password found
                return callback(results[0]);
            } else {
                // user not found
                return callback(null);
            }

        }
    );
}








/*
 * Function that connects to the DBMS and checks if the DB exists, if not
 * creates it, then populates it with a couple of records. This would be
 * removed before deploying the app but is great for
 * development/testing purposes.
 */
async function init() {

    // we'll go over promises in COMP 2537, for now know that it allows us
    // to execute some code in a synchronous manner
    const mysql = require("mysql2/promise");
    const connection = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        multipleStatements: true
    });
    const createDBAndTables = `CREATE DATABASE IF NOT EXISTS cooking;
        use cooking;
        CREATE TABLE IF NOT EXISTS user (
        ID int NOT NULL AUTO_INCREMENT,
        name varchar(30),
        email varchar(30),
        password varchar(30),
        age int(5),
        address varchar(30),
        profession varchar(20),
        PRIMARY KEY (ID));`;
    await connection.query(createDBAndTables);

    // await allows for us to wait for this line to execute ... synchronously
    // also ... destructuring. There's that term again!
    const [rows, fields] = await connection.query("SELECT * FROM user");
    // no records? Let's add a couple - for testing purposes
    if (rows.length == 0) {
        // no records, so let's add a couple
        let userRecords = "insert into user (name, email, password, age, address, profession ) values ?";
        let recordValues = [
            ["Nimrat", "nimratcheema@bcit.ca", "abc123", "21", "Abbey Street", "Student"],
            ["karan", "karanjot@bcit.ca", "abc123", "23", "Aberdeen Street", "Developer"],
            ["Harjot", "harjot@gmail.com", "abc123", "22", "Agar Street", "Student"],
            ["Arron", "arron_ferguson@bcit.ca", "abc123", "30", "Alaska way", "Professor"],
            ["Jason", "jason_harrison@bcit.ca", "abc123", "32", "Alton Place", "Professor"],
            ["Donna", "donna_turner@bcit.ca", "abc123", "28", "Angus Place", "Teacher"]
        ];
        await connection.query(userRecords, [recordValues]);
    }
    const createDBAndTables2 = `CREATE DATABASE IF NOT EXISTS cooking;
        use cooking;
        CREATE TABLE IF NOT EXISTS recepies (
        ID int NOT NULL AUTO_INCREMENT,
        names varchar(30),
        ingredient1 varchar(30),
        ingredient2 varchar(40),
        ingredient3 varchar(40),
        ingredient4 varchar(40),
        ingredient5 varchar(40),
        PRIMARY KEY (ID));`;
    await connection.query(createDBAndTables2);

    // await allows for us to wait for this line to execute ... synchronously
    // also ... destructuring. There's that term again!
    const [rows1, fields1] = await connection.query("SELECT * FROM recepies");
    // no records? Let's add a couple - for testing purposes
    if (rows1.length == 0) {
        // no records, so let's add a couple
        let userRecords1 = "insert into recepies (names, ingredient1, ingredient2, ingredient3, ingredient4, ingredient5) values ?";
        let recordValues1 = [
            ["Maggie", "Salt", "Onion", "Chilli", "Tomatoes", "Vegetables"],
            ["Chickenrap", "Chicken", "Tomatoes", "Salad", "Cheese", "Organo"],
            ["Burger", "Vegetables", "Chicken", "Cheese", "salad", "Spices"],
            ["Cake", "Baking powder", "Corn floor", "Sugar", "Chocolates", "Vanilla"],
            ["Ice-cream", "Vanilla", "Milk", "Sugar", "Fruits", "Cream"],
            ["Butter-Chicken", "Chicken", "Cream", "Butter", "Cashew", "Spices"],
            ["Beef Tacos", "Taco sheels", "Lean ground beef", "water", "seasoning", "salt"],
            ["Egg roll", "onion", "lime juice", "salt", "sugar", "Eggs"],
            ["Salsa burger", "Slasa", "bread crumbs", "cheese", "buns", "avocadoes"],
            ["French fries", "potatoes", "oil", "salt", "seasoning", "catchup"]
        ];
        await connection.query(userRecords1, [recordValues1]);
    }

    console.log("Listening on port " + port + "!");
}

// RUN SERVER
let port = 8000;
app.listen(port, init);