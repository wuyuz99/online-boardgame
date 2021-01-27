//connect to the socket
let socket = io();

//section for defining popup
class Textfill extends React.Component {
    constructor(props){
        super(props);
    }

    render(){
        return(
            <div>
                <label htmlFor={this.props.tagname}><b>{this.props.label}</b></label>
                <input type="text" placeholder={this.props.hint} name={this.props.tagname} value={this.props.variable} onChange={this.props.handleChange} required/>
            </div>
        );
    }
}
class Gametype extends React.Component {
    constructor(props){
        super(props);
        this.makeItem = function(X) {
                return <option key={X}>{X}</option>;
            };
    }

    render(){
        if(this.props.newGame){
            return(
                <div>
                    <label htmlFor="gameType"><b>New game type</b></label>
                    <select name="gameType" value={this.props.variable} onChange={this.props.handleChange} required>
                        <option value="" style={{display: "none"}}>-- select an option --</option>
                        {this.props.gameTypes.map(this.makeItem)}
                    </select>
                    <label htmlFor="number"><b>Room Size</b></label>
                    <input type="number" name="number" value={this.props.number} onChange={this.props.handleChange} required/>
                    <label htmlFor="participate"><b>Participate</b></label>
                    <input type="checkbox" name="participate" onChange={this.props.handleChange} checked={this.props.part}/>
                </div>
            );
        }else{
            return null;
        }
    }
}
class Popup extends React.Component {
    constructor(props){
        super(props);
    }

    render() {
        if(this.props.popup){
            return(
                <div className="modal">
                    <form className="modal-content" onSubmit={this.props.handleSubmit}>
                        <div className="container">
                            <Textfill tagname="usrName" variable={this.props.usrName} handleChange={this.props.handleChange} hint="enter your name" label="Name" />
                            <Textfill tagname="roomNo" variable={this.props.roomNo} handleChange={this.props.handleChange} hint="enter room number" label="Room number"/>
                            <Gametype gameTypes={this.props.gameTypes} newGame={this.props.newGame} variable={this.props.gameType} number={this.props.number} part={this.props.participate} handleChange={this.props.handleChange}/>
                            <button type="submit">Go!</button>
                        </div>
                    </form>
                </div>
            );
        }
        return null;
    }
}
class ShowPopup extends React.Component {
    constructor(props){
        super(props);
    }
    render(){
        if(this.props.popup){
            return null;
        }
        return(
            <div className="showPopup">
                <p>{this.props.gameType}</p>
                <button onClick={this.props.handleClick}>Exit room</button>
            </div>
        );
    }
}


//section for defining the Timebomb game
class PlayerField extends React.Component {
    constructor(props){
        super(props);
    }

    render(){
        if(this.props.wins == -1){
            let cards = [];
            if(this.props.cards != undefined){
                for(let i = 0; i < this.props.cards.length; i++){
                    cards.push(<button key={i} onClick={()=>this.props.cut(this.props.index, i, this.props.myturn)}>{this.props.cards[i]}</button>);
                }
            }
            return(
                <div className="column">
                    <p>{this.props.name}</p>
                    {cards}
                </div>
            );
        }
        let text = "";
        if(this.props.wins === this.props.role){
            text = "Won!";
        }else{
            text = "lost";
        }
        let role = null;
        if(!this.props.mine){
            role = <p>Role: {this.props.role}</p>;
        }
        return(
            <div className="column">
                <p>{this.props.name}</p>
                {role}
                <p>{text}</p>
            </div>
        );
    }
}
class Timebomb extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            myrole: -1,
            round: 0,
            myturn: false,
            cards: [],
            roles: [],
            wins: -1,
        };

        this.cut = this.cut.bind(this);

        socket.on("status", (status) => {
            let myrole = status[0];
            let cards = status[1];
            let round = status[2];

            this.setState({myrole: myrole, round: round})
            this.setState({cards: this.slice(cards, round)});
        });

        socket.on("Timebomb_turn", () => {
             console.log("my turn");
             this.setState({myturn: true});
        });

        socket.on("end", (status, roles) => {
            this.setState({roles, roles});
            let wins = -1;
            if(status === "diffused"){
                wins = 1;
            }else{
                wins = 2;
            }
            this.setState({wins, wins});
        });
    }
    slice(arr, round){
        let length = this.props.names.length;
        let cards = [];
        for(let i = 0; i < length; i++){
            cards.push(arr.slice(i * (5 - round), (i + 1) * (5 - round)));
        }
        console.log(cards);
        return cards;
    }
    cut(x, y, myturn){
        if(!myturn){
            alert("not your turn");
            return;
        }
        socket.emit("Timebomb_cut", x, y);
        this.setState({myturn: false});
    }
    render(){
        let players = [];

        for(let i = 0; i < this.state.cards.length; i++){
            if(i != this.props.myid){
                players.push(<PlayerField key={i} index={i} name={this.props.names[i]} cards={this.state.cards[i]} wins={this.state.wins} role = {this.state.roles[i]} cut={this.cut} myturn={this.state.myturn}/>)
            }
        }

        let endButton = null;
        if(this.state.wins != -1){
            endButton = <button onClick={this.props.back}> Return </button>;
        }

        return(
            <div className="Timebomb">
                <div className="row">
                    {players}
                </div>
                <div className="row">
                    <div className="column2"><p>{this.state.myrole}</p></div>
                    <div className="column3"><PlayerField index={this.props.myid} name={this.props.name} cards={this.state.cards[this.props.myid]} wins={this.state.wins} role={this.state.roles[this.props.myid]} mine={true} cut={() => void 0}/></div>
                </div>
                {endButton}
            </div>
        );
    }
}

//section for selection of games
let gamecomponents = {
    "Timebomb": Timebomb
};

class Gameboard extends React.Component {
    constructor(props){
        super(props);
        this.state = {
            started: false,
            names: [],
            myid: -1,
        };
        this.startGame = this.startGame.bind(this);
        this.back = this.back.bind(this);

        socket.on("start", () => {
            let id = this.state.names.indexOf(this.props.name);
            this.setState({started: true, myid: id});
            socket.emit("status");
        });
    }
    startGame(){
        socket.emit("start");
    }
    back(){
        socket.removeAllListeners("status");
        socket.removeAllListeners("Timebomb_turn");
        socket.removeAllListeners("end");
        this.setState({started: false});
    }
    render(){
        socket.on("playerlist", (l) => {
            this.setState({names: l});
        });
        let GameTag = gamecomponents[this.props.gameType];
        if(this.props.popup){
            return null;
        }
        if(!this.state.started){
            let startButton = null;
            if(this.props.newGame){
                startButton = <button onClick={this.startGame}> Start </button>;
            }
            let nameslist = [];
            for (let i = 0; i < this.state.names.length; i++){
                nameslist.push(<li key={this.state.names[i]}>{this.state.names[i]}</li>);
            }
            return(
                <div>
                    <ul>
                        {nameslist}
                    </ul>
                    {startButton}
                </div>
            );
        }
        return(
            <div>
                <GameTag name={this.props.name} names={this.state.names} myid = {this.state.myid} back={this.back}/>
            </div>
        );
    }
}

//section that renderes the whole page
class ClientManager extends React.Component {
    constructor(props){
        super(props);
        this.state={popup: true, usrName: "a", roomNo: "b", gameTypes:[], gameType: "", participate: true, newGame: false, number: 8};

        this.popupChange = this.popupChange.bind(this);
        this.popupSubmit = this.popupSubmit.bind(this);
        this.showPopup = this.showPopup.bind(this);

        socket.onAny((eventName, ...args) => {
            console.log(eventName, ...args);
        });

        socket.on("gamelist", (types) => {
            this.setState({gameTypes: types})
        });

        socket.on("roomCreated", () => {
            socket.emit("joinRoom", this.state.roomNo, this.state.usrName, this.state.participate);
        });

        socket.on("room", (type) => {
            if(type == null){
                this.setState({newGame: true});
            }else{
                socket.emit("joinRoom", this.state.roomNo, this.state.usrName, this.state.participate);
                this.setState({gameType: type});
            }
        });

        socket.on("joinedRoom",(status) => {
            if(status === "full"){
                alert("room full");
            }else if(status === "repeat"){
                alert("name already exists");
            }else if(status === "started"){
                alert("game already started");
            }else{
                this.setState({popup: false});
            }
        });
    }

    popupChange(event) {
        if(event.target.type === "checkbox"){
            this.setState({[event.target.name]: event.target.checked});
        }else{
            this.setState({[event.target.name]: event.target.value});
        }
    }
    popupSubmit(event) {
        event.preventDefault();
        if(this.state.newGame === false){
            socket.emit("checkRoom", this.state.roomNo);
        }else{
            socket.emit("createRoom", this.state.roomNo, this.state.gameType, this.state.number);
        }
    }
    showPopup(){
        socket.emit("leave");
        this.setState({newGame: false});
        this.setState({popup: true});
    }

    render(){
        return(
            <div>
                <ShowPopup popup={this.state.popup} handleClick={this.showPopup} gameType={this.state.gameType}/>
                <Gameboard popup={this.state.popup} gameType={this.state.gameType} name={this.state.usrName} newGame={this.state.newGame}/>
                <Popup popup={this.state.popup} usrName={this.state.usrName} roomNo={this.state.roomNo} gameTypes={this.state.gameTypes} gameType={this.state.gameType} participate={this.state.participate} newGame={this.state.newGame} number={this.state.number} handleChange={this.popupChange} handleSubmit={this.popupSubmit}/>
            </div>
        )
    }
}

const domContainer = document.querySelector('#root');
ReactDOM.render(<ClientManager/>, domContainer);
