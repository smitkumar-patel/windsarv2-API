const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const port = 3000;
const http = require("http");
var cors = require("cors");

const Pool = require("pg").Pool;
const { response } = require("express");
const { send } = require("process");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DATABASE_USER,
  host: process.env.DATABASE_HOST,
  database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT,
  ssl: {
    rejectUnauthorized: false,
  },
});
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
app.use(cors());
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.get("/", (request, response) => {
  response.send("Welcome to WindsARV2");
});

app.listen(process.env.PORT || port, () => {
  console.log(`App running on port ${port}.`);
});

app.post("/registerBusiness", (req, res) => {
  const {
    name,
    address,
    category,
    latitude,
    longitude,
    email,
    password,
    type,
  } = req.body;
  console.log(
    name,
    address,
    category,
    latitude,
    longitude,
    email,
    password,
    type
  );

  pool.query(
    "INSERT INTO users(name, email, password,type) VALUES ($1,$2,$3,$4)",
    [name, email, password, type],
    (error, results) => {
      if (error) {
        res.send({ success: "False" });
      } else {
        var user_id = 0;
        pool.query(
          "SELECT * FROM users where email=$1 and password=$2",
          [email, password],
          (error2, results2) => {
            if (error2) {
              res.send({ success: "False" });
            } else {
              user_id = results2.rows[0].user_id;
              pool.query(
                "INSERT INTO bussiness_owner_information(user_id, address, category, latitude, longitude) VALUES ($1, $2, $3, $4, $5)",
                [user_id, address, category, latitude, longitude],
                (error3, results3) => {
                  if (error3) {
                    console.log(error3);
                  } else {
                    res.send({ success: "True" });
                  }
                }
              );
            }
          }
        );
      }
    }
  );
});

app.post("/registerUser", (req, res) => {
  const { name, email, password, dob, type } = req.body;
  var flag = "true";
  pool.query(
    "INSERT INTO users(name, email, password,type) VALUES ($1,$2,$3,$4)",
    [name, email, password, type],
    (error, results) => {
      if (error) {
        flag = "false";
      }
    }
  );
  if (flag == "false") {
    res.send({ success: "False" });
  } else {
    var user_id = 0;
    pool.query(
      "SELECT * FROM users where email=$1 and password=$2",
      [email, password],
      (error, results) => {
        if (error) {
          res.send({ success: "False" });
        } else {
          user_id = results.rows[0].user_id;
          pool.query(
            "INSERT INTO customer_information(user_id,dob) VALUES ($1,$2)",
            [user_id, dob],
            (error2, results2) => {
              if (error2) {
                console.log(error2);
                res.send({ success: "False" });
              } else {
                res.send({ success: "True" });
              }
            }
          );
        }
      }
    );
  }
});

app.post("/loginUser", (req, res) => {
  const { email, password } = req.body;
  pool.query(
    "SELECT * FROM users where email=$1 and password=$2",
    [email, password],
    (error, results) => {
      if (error) {
        throw error;
      } else {
        if (results.rowCount > 0) {
          res.send({
            success: "True",
            type: results.rows[0].type,
            user_id: results.rows[0].user_id,
          });
        } else {
          res.send({ success: "False" });
        }
      }
    }
  );
});

app.post("/updateProfile", (req, res) => {
  const { user_id, name, email } = req.body;
  pool.query(
    "UPDATE users SET name=$1, email=$2 WHERE user_id=$3",
    [name, email, user_id],
    (err, results) => {
      if (err) {
        console.log(error);
        res.send({ success: "False", message: "Update error" });
      } else {
        res.send({ success: "True" });
      }
    }
  );
});

app.post("/getCustoemerLocationHistory", (req, res) => {
  const { user_id } = req.body;
  pool.query(
    'select user_id,id,name,time,address,"visitedWhen",imagelink from customer_location_history,marker_information where id="marker_information"."markerKey" and user_id=$1',
    [user_id],
    (error, results) => {
      if (error) {
        console.log(error);
        throw error;
      } else {
        res.send(results.rows);
      }
    }
  );
});

app.get("/getMarkerInfo", (req, res) => {
  pool.query("SELECT * FROM marker_information", (error, results) => {
    if (error) {
      throw error;
    } else {
      res.send(results.rows);
    }
  });
});

app.post("/locationVisited", (req, res) => {
  const { user_id, winCoins, markerKey } = req.body;
  console.log(user_id, winCoins, markerKey);
  pool.query(
    'select "winCoins","placeVisited" from customer_information where user_id=$1',
    [user_id],
    (err, results) => {
      if (err) {
        console.log(err);
      } else {
        pool.query(
          'UPDATE customer_information SET "winCoins"=$1, "placeVisited"=$2 WHERE user_id=$3',
          [
            results.rows[0].winCoins + winCoins,
            ++results.rows[0].placeVisited,
            user_id,
          ],
          (error2, results2) => {
            if (error2) {
              console.log(error);
            } else {
              /// Get the current time
              let date = new Date();
              var hours = date.getHours();
              var minutes = date.getMinutes();
              var ampm = hours >= 12 ? "pm" : "am";
              hours = hours % 12;
              hours = hours ? hours : 12;
              minutes = minutes < 10 ? "0" + minutes : minutes;
              var strTime = hours + ":" + minutes + " " + ampm;
              /// Get current date
              var today_date = date.toISOString().split("T")[0];
              //

              pool.query(
                'INSERT INTO customer_location_history(user_id, id, "time", "visitedWhen") VALUES ($1, $2, $3, $4)',
                [user_id, markerKey, strTime, today_date],
                (error3, results3) => {
                  if (error3) {
                    throw err;
                  } else {
                    res.send({ success: "true" });
                  }
                }
              );
            }
          }
        );
      }
    }
  );
});

app.post("/deleteBussinessVoucher", (req, res) => {
  const { user_id, id } = req.body;
  pool.query(
    "delete from bussiness_vouchers where user_id=$1 and id=$2",
    [user_id, id],
    (error, result) => {
      if (error) {
        res.send({ success: "false" });
      } else {
        res.send({ success: "true" });
      }
    }
  );
});

app.get("/getVoucherDataForUser", (req, res) => {
  pool.query(
    'select name as "businessName","actualPrice",id,"productName","winCoins","discountPrice",to_char("expiryDate",\'YYYY-MM-DD\') as "expiryDate" from users,bussiness_vouchers where users.user_id=bussiness_vouchers.user_id',
    (error, results) => {
      if (error) {
        throw error;
      } else {
        res.send(results.rows);
      }
    }
  );
});

app.post("/getVoucherData", (req, res) => {
  const { user_id } = req.body;

  pool.query(
    'select name,"actualPrice",id,"productName","winCoins","discountPrice",to_char("expiryDate",\'YYYY-MM-DD\') as "expiryDate" from users,bussiness_vouchers where users.user_id=bussiness_vouchers.user_id and users.user_id=$1',
    [user_id],
    (error, results) => {
      if (error) {
        throw error;
      } else {
        res.send(results.rows);
      }
    }
  );
});

app.post("/addVoucher", (req, res) => {
  const { user_id, productName, discountPrice, actualPrice, expiryDate } =
    req.body;
  let winCoins = Math.floor(Math.random() * 500 + 300);

  pool.query(
    'INSERT INTO bussiness_vouchers (user_id,"productName", "discountPrice", "expiryDate", "actualPrice", "winCoins") VALUES ($1,$2,$3,$4,$5,$6)',
    [user_id, productName, discountPrice, expiryDate, actualPrice, winCoins],
    (error, results) => {
      if (error) {
        console.log(error);
        throw error;
      } else {
        pool.query(
          "select * from users where user_id=$1",
          [user_id],
          (error2, results2) => {
            if (error2) {
              throw error2;
            } else {
              res.send({
                success: "true",
                businessName: results2.rows[0].name,
                productName: productName,
                expiryDate: expiryDate,
                winCoins: winCoins,
              });
            }
          }
        );
      }
    }
  );
});

app.post("/businessInfo", (req, res) => {
  const { user_id } = req.body;
  pool.query(
    "SELECT * FROM users where user_id=$1",
    [user_id],
    (error, results) => {
      if (error) {
        console.log(error);
        throw error;
      } else {
        pool.query(
          "SELECT * FROM bussiness_owner_information where user_id=$1",
          [user_id],
          (error2, results2) => {
            if (error) {
              console.log(error);
              throw error;
            } else {
              res.send({
                name: results.rows[0].name,
                email: results.rows[0].email,
              });
            }
          }
        );
      }
    }
  );
});

app.post("/customerInfo", (req, res) => {
  const { user_id } = req.body;
  pool.query(
    "SELECT * FROM users where user_id=$1",
    [user_id],
    (error, results) => {
      if (error) {
        console.log(error);
        throw error;
      } else {
        pool.query(
          "SELECT * FROM customer_information where user_id=$1",
          [user_id],
          (error2, results2) => {
            if (error) {
              console.log(error);
              throw error;
            } else {
              res.send({
                name: results.rows[0].name,
                email: results.rows[0].email,
                winCoins: results2.rows[0].winCoins,
                placeVisited: results2.rows[0].placeVisited,
                age: results2.rows[0].age,
                vouchers: results2.rows[0].vouchers,
              });
            }
          }
        );
      }
    }
  );
});
