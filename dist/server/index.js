"use strict";var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault"),_classCallCheck2=_interopRequireDefault(require("@babel/runtime/helpers/classCallCheck")),_createClass2=_interopRequireDefault(require("@babel/runtime/helpers/createClass")),_possibleConstructorReturn2=_interopRequireDefault(require("@babel/runtime/helpers/possibleConstructorReturn")),_getPrototypeOf2=_interopRequireDefault(require("@babel/runtime/helpers/getPrototypeOf")),_inherits2=_interopRequireDefault(require("@babel/runtime/helpers/inherits")),__importDefault=function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(exports,"__esModule",{value:!0});var ws_1=__importDefault(require("ws")),events_1=__importDefault(require("events")),client_1=__importDefault(require("./client")),message_1=__importDefault(require("./message")),Server=function(e){function Server(e){var t;return(0,_classCallCheck2.default)(this,Server),(t=(0,_possibleConstructorReturn2.default)(this,(0,_getPrototypeOf2.default)(Server).call(this))).clients=[],e||(e={}),t.setup(e),t}return(0,_inherits2.default)(Server,e),(0,_createClass2.default)(Server,[{key:"send",value:function send(e){this.clients.forEach((function(t){return t.send(e)}))}},{key:"setup",value:function setup(e){var t=this;this.wss&&this.wss.close(),this.heartbeatConfig=e.heartbeat||{enabled:!1},this.reconnectConfig=e.reconnect||{enabled:!1},this.authenticationConfig=e.authentication||{},this.wss=new ws_1.default.Server({port:e.port||4e3}),this.wss.on("connection",(function(e){return t.registerClient(e)}))}},{key:"registerClient",value:function registerClient(e){var t=new client_1.default(e,this);t.send(new message_1.default(10,this.fetchClientConfig())),this.clients.push(t),this.emit("connection",t)}},{key:"fetchClientConfig",value:function fetchClientConfig(){var e={};return this.heartbeatConfig.enabled&&(e.c_heartbeat_interval=this.heartbeatConfig.interval),this.reconnectConfig.enabled&&(e.c_reconnect_interval=this.reconnectConfig.interval),this.authenticationConfig.timeout&&(e.c_authentication_timeout=this.authenticationConfig.timeout),e}}]),Server}(events_1.default);exports.default=Server;