const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server Running at http://localhost:3001/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const createPassword = await bcrypt.hash(password, 8);
  const checkingUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const isUserPresent = await db.get(checkingUserQuery);
  if (password.length >= 5) {
    if (isUserPresent === undefined) {
      const creatUserQuery = `
                INSERT INTO user (username, name, password, gender, location)
                VALUES (
                    '${username}','${name}','${createPassword}','${gender}','${location}'
                );`;
      await db.run(creatUserQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("User already exists");
    }
  } else {
    response.status(400);
    response.send("Password is too short");
  }
});

// login user API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const checkingUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(checkingUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

// change-password API
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkingUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(checkingUserQuery);
  const createPassword = await bcrypt.hash(newPassword, 8);
  const isPasswordMatched = await bcrypt.compare(oldPassword, dbUser.password);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    if (isPasswordMatched === true) {
      if (newPassword.length >= 5) {
        const updatePasswordQuery = `
        UPDATE 
            user
        SET
            password = '${createPassword}'
        WHERE 
            username = '${username}';`;
        await db.run(updatePasswordQuery);
        response.status(200);
        response.send("Password updated");
      } else {
        response.status(400);
        response.send("Password is too short");
      };
    } else {
      response.status(400);
      response.send("Invalid current password");
    };
  };
});

module.exports = app;
