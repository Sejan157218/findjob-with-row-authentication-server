const express = require("express");
const app = express();
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;
const port = process.env.PORT || 9000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.57jms.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// for verify JWT
async function verifyToken(req, res, next) {
  if (req.body?.authorization?.startsWith("Bearer ")) {
    const token = req.body.authorization.split(" ")[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT);
      const { userName, userId } = decoded;
      req.requestEmail = userName;
    } catch {}
  }

  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("find-job");
    const userCollection = database.collection("users");
    const userLoginCollection = database.collection("login-user");
    const jobCollection = database.collection("all-job");

    // post users
    app.post("/users", async (req, res) => {
      const body = req.body;
      const result = await userCollection.insertOne(body);
      if (result.insertedId) {
        const token = jwt.sign(
          {
            userName: body.email,
            userId: result.insertedId,
          },
          process.env.JWT
        );
        res.status(200).json({
          access_token: token,
          message: "Signup successful!",
        });
      }
    });
// post login
    app.post("/userslogin", async (req, res) => {
      const body = req.body;
      const find = { email: body.email };
      const result = await userCollection.findOne(find);

      if (result) {
        if (result.email == body.email && result.password == body.password) {
          const token = jwt.sign(
            {
              userName: result.email,
              userId: result._id,
            },
            process.env.JWT
          );
          res.status(200).json({
            access_token: token,
            message: "Login successful!",
          });
        } else {
          res.json({ error: "Password not match" });
        }
      } else {
        res.json({ error: "User not found" });
      }
      
    });

    // post Login users
    app.post("/loginuser", verifyToken, async (req, res) => {
      const requestEmail = req.requestEmail;
      const filter = { email: requestEmail };
      const findresult = await userCollection.findOne(filter);
      const result = await userLoginCollection.insertOne(findresult);
      res.json(result);
    });
    // get Login users
    app.get("/loginuser", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const result = await userLoginCollection.findOne(filter);
      res.send(result);
    });
    // get Login users
    app.delete("/loginuser", async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const result = await userLoginCollection.deleteOne(filter);
      res.json(result);
    });

    // job post
    app.post("/jobpost", async (req, res) => {
      const body = req.body;
      const result = await jobCollection.insertOne(body);
      res.json(result);
    });

    // get Login users
    app.get("/jobpost", async (req, res) => {
      const result = await jobCollection.find({}).toArray();
      res.send(result);
    });

    // delete job post
    app.delete("/jobpost", async (req, res) => {
      const id = req.query.id;
      const find = { _id: ObjectId(id) };
      const result = await jobCollection.deleteOne(find);
      res.json(result);
    });
  } finally {
    
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Find Your Job");
});

app.listen(port, () => {
  console.log(`Find Your Job`, port);
});
