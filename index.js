const express = require('express')
const app = express()
const sqlite = require("better-sqlite3");
const session = require("express-session")
const SqliteStore = require("better-sqlite3-session-store")(session)
const db2 = new sqlite("./sessions.db");
const http = require('http');
const server = http.createServer(app)
var iosession = require('socket.io-express-session')
app.use(express.json({ limit: "10mb" }));const cors = require('cors')
const fs = require('fs');
const { debugPort } = require('process');
const io = require('socket.io')(server, {
    cors: {
        origin: "*",

    }
})


app.use(cors())
var mysession = session({
    secret: 'something highly secret :D', saveUninitialized: true, cookie: { sameSite: false, maxAge: 1000 * 60 * 60 * 24 * 7, secure: false },
    resave: false, store: new SqliteStore({
        client: db2,
        expired: {
            clear: true,
            intervalMs: 1000 * 60 * 60 * 12 //ms = 15min
        }
    })
}
)
app.use(mysession
)
app.post("/out",(req,res)=>{
console.log("out");
console.log(req.body);
    req.session.name=""
req.session.id=""
res.redirect("/")
})
io.use(iosession(mysession, { autoSave: true }))

app.get("/", (req, res) => {

    res.sendFile(__dirname + (req.session.name? "/index.html": "/login.html"))
})
// io.use(iosession(mysession))

app.post('/alert', cors(), (req, res) => {

    console.log(req.body);
    console.log(req.session);

})
app.post('/',  (req, res) => {


    
    var db = new sqlite(__dirname + '/web.db')
    var results = db.prepare('select name,password from login where (name=? and password=?)').get(req.body.name, req.body.password)
    if (!results) {
        var name = db.prepare('select name from login where name=?').get(req.body.name)
        if (!name) {
            db.prepare('insert into login (name,password) values(?,?)').run(req.body.name, req.body.password)
            req.session.name = req.body.name;

            req.session.myid=db.prepare('select ID from login where name=?').get(req.body.name)["ID"]
            console.log( req.session.myid);
            req.session.save()
            console.log(req.session.name);
            // req.session.save()
            res.send("go");

        } else {
            res.send("wrong info")
        }
    } else {
        req.session.name = req.body.name;
        req.session.myid=db.prepare('select ID from login where name=?').get(req.body.name)["ID"]
        console.log( req.session.myid);
        req.session.save()

        console.log(req.session.name);

        // req.session.save()
        res.send("go")

    }
    console.log(req.body);
})


app.post("/item", (req,res) => {
    var db = new sqlite(__dirname + '/web.db')
    let counter = 0;
    fs.readdirSync("./images/", (files) => {
        counter++;
    })
    console.log("./images/"+counter+req.body.name);

console.log(req.body);
    fs.writeFile("./images/"+counter+req.body.name,Buffer.from(Object.values(req.body.img)),(e)=>{
        // console.log(e);
        io.emit("update",{title:req.body.title,des:req.body.des,img:"/images/"+counter+req.body.name});
        db.prepare('insert into offers (ID,title,description,img) values(?,?,?,?)').run(req.session.myid,req.body.title,req.body.des,counter+req.body.name);

    })
    


})

var counter = 0;
io.on('connection', (socket) => {

    var db = new sqlite(__dirname + '/web.db')

    
    socket.emit("offers",{offers:db.prepare('select * from offers').all()});
    socket.emit("info",{name:socket.handshake.session.name})
    // console.log( socket.handshake.session);
    console.log(counter);
    // console.log(io.sockets);
    socket.on('msg', (data) => {

        counter++;
        console.log(counter);
        // console.log( socket.handshake);
        // console.log( socket.handshake);
        io.emit('msg', { msg: data.msg, name: socket.handshake.session.name })
    })
})
app.use(express.static(__dirname + "/"))

server.listen(3002, () => {

    console.log('Server has started successfully');
})