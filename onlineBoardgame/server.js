//import library
let app = require('express')();
let http = require('http').createServer(app);

let io = require('socket.io')(http);

//set up constants
let PORT = 8000

// serve webpage
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/webpage/index.html');
});
app.get("/*", (req, res) =>{
    try{
        res.sendFile(__dirname + "/webpage/" + req.params['0'])
    }catch(ENOENT){
        res.status(404).send('Not found');
    }
})

//define helper function shuffle
function shuffle(array){
    for(let i = array.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * i);
        const temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
        currentDate = Date.now();
    } while (currentDate - date < milliseconds);
}


//define game manager
class game{
    constructor(roomNo, Maxsize){
        this.roomNo = roomNo;
        this.maxsize = Maxsize;
        this.npeople = 0;
        this.nspec = 0;
        this.players = [];
        this.playerids = [];
        this.spectators = [];
        this.spectatorids = [];
        this.disconnected = {};
        this.started = false;
    }
    find(playername){
        return this.players.indexOf(playername);
    }
    getName(id){
        let ind = this.playerids.indexOf(id);
        if(ind != -1){
            return this.players[ind];
        }else{
            return null;
        }
    }
    join(playername, playerid, spectate){
        if(spectate){
            this.spectators.push(playername);
            this.spectatorids.push(playerid);
            this.nspec += 1;
            console.log(this.roomNo + ": " + playername + " starts spectating");
            return "spectate";
        }
        if(this.npeople === this.maxsize){      //if full
            return "full";
        }
        if(playername in this.disconnected){    //if reconnect
            let pos = this.disconnected[playername];
            this.players[pos] = playername;
            this.playerids[pos] = playerid;
            delete this.disconnected[playername];
            console.log(this.roomNo + ": " + playername + " reconnected");
            return "reconnected";
        }
        if(this.started){
            return "started";
        }
        this.players.push(playername);
        this.playerids.push(playerid);
        this.npeople += 1;
        console.log(this.roomNo + ": " + playername + " joined");
        return "joined";
    }
    leave(playername){
        let pos = this.spectators.indexOf(playername);
        if(pos != -1){    // if spectator
            this.spectators.splice(pos, 1);
            this.spectatorids.splice(pos, 1);
            this.nspec -= 1;
            console.log(this.roomNo + ": " + playername + " stopped spectating");
            return;
        }
        pos = this.find(playername);
        if(pos === -1){
            return;
        }
        if(this.started){
            this.players[pos] = null;
            this.disconnected[playername] = pos;
            console.log(this.roomNo + ": " + playername + " disconnected in game");
            return;
        }
        this.players.splice(pos, 1);
        this.playerids.splice(pos, 1);
        this.npeople -= 1;
        console.log(this.roomNo + ": " + playername + " left game");
        return;
    }
}

class Timebomb extends game{
    constructor(roomid, Maxsize){
        super(roomid, Maxsize);
        this.minsize = 0;
        this.gameroles = {
            4: [3, 2],
            5: [3, 2],
            6: [4, 2],
            7: [5, 3],
            8: [5, 3],
        };
        this.gamecards = {
            4: 15,
            5: 19,
            6: 23,
            7: 27,
            8: 31,
        };
        this.roles = [];
        this.cards = [];
        this.mask = [];
        this.maxround = 4;
        this.round = 0;
        this.type = "Timebomb";
        this.starter = 0;
        this.current = 0;
    }
    start(){
        console.log("game started");
        this.roles = [];
        this.cards = [];
        this.mask = [];
        this.round = 0;

        for(let i = 0; i < this.gameroles[this.npeople][0]; i++){
            this.roles.push(1);
        }
        for(let i = 0; i < this.gameroles[this.npeople][1]; i++){
            this.roles.push(2);
        }
        for(let i = 0; i < this.gamecards[this.npeople]; i++){
            this.cards.push(1);
            this.mask.push(false);
        }
        for(let i = 0; i < this.npeople; i++){
            this.cards.push(2);
            this.mask.push(false);
        }
        this.cards.push(3);
        this.mask.push(false);

        shuffle(this.cards);
        shuffle(this.roles);
        this.starter = Math.floor(Math.random() * Math.floor(this.npeople));
        this.current = this.starter;
        this.started = true;
    }

    status(id){
        let pos = this.playerids.indexOf(id);
        let myrole = this.roles[pos];
        let cards = [...this.cards];
        let mask = [...this.mask];
        for(let i = pos * (5 - this.round); i < (pos + 1) * (5 - this.round); i++){
            mask[i] = !mask[i];
        }
        for(let i = 0; i < cards.length; i++){
            if(!mask[i]){
                cards[i] = 0;
            }
        }
        return [myrole, cards, this.round];
    }

    cut(x, y){
        let pos = x * (5 - this.round) + y;
        let card = this.cards[pos];
        //clicked on chosen card
        if(this.mask[pos]){
            return(-1)
        }
        this.mask[pos] = true;
        return card;
    }
    next(c){
        // if bomb
        if(c == 3){
            console.log("exploded");
            this.started = false;
            return("exploded");
        }
        // if all diffuse found
        if(this.cards.indexOf(2) == -1){
            this.started = false;
            return("deffused");
        }
        this.current = (this.current + 1) % this.npeople;
        if(this.current === this.starter){
            //go to next round
            this.round += 1;
            if(this.round === this.maxround){
                this.started = false;
                return("timeup");
            }
            this.starter = (this.starter - 1 + this.npeople) % this.npeople;
            this.current = this.starter;
            for(let i = 0; i < this.cards.length; i++){
                if(this.mask[i]){
                    this.cards[i] = undefined;
                    this.mask[i] = false;
                }
            }
            this.cards = this.cards.filter((x) => {
                return x != undefined;
            });
            shuffle(this.cards);
        }
        return("continue");
    }
}
class gameManager{
    constructor(){
        this.instances = {};
        this.idRoomNumber = {};
        this.games=["Timebomb"];
    }
    check(roomNo){
        return roomNo in this.instances;
    }
    type(roomNo){
        return(typeof(this.instances[roomNo]));
    }
    makeGame(roomNo, type, Maxsize){
        let g = eval(`new ${type}(roomNo, Maxsize)`)
        this.instances[roomNo] = g;
        console.log(roomNo + " created");
    }
    checkRemove(id){
        if(this.check(id)){
            let inst = this.instances[id];
            if(inst.npeople == 0 && inst.nspec == 0){
                delete this.instances[id];
                console.log(id + " deleted");
            }
        }
    }
}

let gm = new gameManager();

//set up socket communication
io.on('connection', (socket) => {
    //once connected
    socket.emit("gamelist", gm.games);
    console.log(socket.id + ' connected ');

    socket.onAny((eventName, ...args) => {
        console.log(eventName, ...args);
    });
    //check room
    socket.on("checkRoom", (roomNo) =>{
        if(gm.check(roomNo)){
            socket.emit("room", gm.instances[roomNo].type);
        }else{
            socket.emit("room", null);
        }
    });

    //create room
    socket.on("createRoom", (roomNo, type, number) => {
        gm.makeGame(roomNo, type, number);
        socket.emit("roomCreated");
    });

    //join room
    socket.on("joinRoom", (roomNo, usrName, participate) => {
        let status = "fail";
        if(gm.check(roomNo)){
            if(gm.instances[roomNo].players.indexOf(usrName) != -1){
                status = "repeat";
            }else{
                status = gm.instances[roomNo].join(usrName, socket.id, !participate)
                if(status != "full"){
                    gm.idRoomNumber[socket.id] = roomNo;
                    socket.join(roomNo);
                    io.to(roomNo).emit("playerlist", gm.instances[roomNo].players);
                }
            }
            socket.emit("joinedRoom", status);
            if(status === "reconnected"){
                socket.emit("start");
            }
        }
    });

    //start game
    socket.on("start", () =>{
        let roomNo = gm.idRoomNumber[socket.id];
        if(roomNo in gm.instances){
            gm.instances[roomNo].start();
            io.to(roomNo).emit("start");
            if(gm.instances[roomNo].type === "Timebomb"){
                io.to(gm.instances[roomNo].playerids[gm.instances[roomNo].current]).emit("Timebomb_turn");
            }
        }
    });

    //send game status
    socket.on("status", () => {
        let roomNo = gm.idRoomNumber[socket.id];
        if(roomNo in gm.instances){
            socket.emit("status", gm.instances[roomNo].status(socket.id));
        }
    });

    socket.on("Timebomb_cut", (x, y) => {
        let roomNo = gm.idRoomNumber[socket.id];
        if(roomNo in gm.instances){
            let room = gm.instances[roomNo]
            if(room.playerids.indexOf(socket.id) === room.current){
                let status = room.cut(x, y);
                if(status != -1){
                    for(let i = 0; i < room.npeople; i++){
                        let id = room.playerids[i];
                        io.to(id).emit("status", room.status(id))
                    }
                    status = room.next(status);
                    sleep(1000);
                    for(let i = 0; i < room.npeople; i++){
                        let id = room.playerids[i];
                        io.to(id).emit("status", room.status(id))
                    }
                }
                if(status === -1 || status === "continue"){
                    io.to(room.playerids[room.current]).emit("Timebomb_turn");
                }else{
                    io.to(roomNo).emit("end", status, room.roles);
                }
            }
        }
    });

    //once leave game
    socket.on("leave", () => {
        let roomNo = gm.idRoomNumber[socket.id];
        console.log(roomNo);
        if(roomNo != undefined){
            gm.instances[roomNo].leave(gm.instances[roomNo].getName(socket.id));
            gm.checkRemove(roomNo);
        }
        delete gm.idRoomNumber[socket.id];
    });

    //once disconnected
    socket.on('disconnect', () => {
        let roomNo = gm.idRoomNumber[socket.id];
        if(roomNo != undefined){
            gm.instances[roomNo].leave(gm.instances[roomNo].getName(socket.id));
            gm.checkRemove(roomNo);
        }
        delete gm.idRoomNumber[socket.id];
        console.log(socket.id + ' disconnected');
    });
});

//start the server
http.listen(PORT, () => {
  console.log('listening on *:' + PORT);
});
