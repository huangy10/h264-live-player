"use strict";

var Avc            = require('../broadway/Decoder');
var YUVWebGLCanvas = require('../canvas/YUVWebGLCanvas');
var YUVCanvas      = require('../canvas/YUVCanvas');
var Size           = require('../utils/Size');
var Class          = require('uclass');
var Events         = require('uclass/events');
var debug          = require('debug');
var log            = debug("wsavc");

var WSAvcPlayer = new Class({
  Implements : [Events],


  initialize : function(canvas, canvastype) {

    this.canvas     = canvas;
    this.canvastype = canvastype;

    // AVC codec initialization
    this.avc = new Avc();
    if(false) this.avc.configure({
      filter: "original",
      filterHorLuma: "optimized",
      filterVerLumaEdge: "optimized",
      getBoundaryStrengthsA: "optimized"
    });

    //WebSocket variable
    this.ws;
    this.pktnum = 0;
    this.canvasInited = false;
    this.dbg_output = document.getElementById("dbg_msg");
  },

  dbg : function(msg) {
    if(this.dbg_output) {
      this.dbg_output.innerText = msg;
    }
  },


  decode : function(data) {
    var naltype = "invalid frame";

    if (data.length > 4) {
      if (data[4] == 0x65) {
        naltype = "I frame";
      }
      else if (data[4] == 0x41) {
        naltype = "P frame";
      }
      else if (data[4] == 0x67) {
        naltype = "SPS";
      }
      else if (data[4] == 0x68) {
        naltype = "PPS";
      }
    } 
    this.avc.decode(data);
  },

  connect : function(url, callback) {
    var running = true;
    // Websocket initialization
    if (this.ws != undefined) {
      this.ws.close();
      delete this.ws;
    }
    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      log("Connected to " + url);
      running = true;
      callback();
    };


    var framesList = [];

    this.ws.onmessage = (evt) => {
      if(typeof evt.data == "string") {
        this.dbg("receive canvas configuration");
        this.canvasInited = true;
        return this.cmd(JSON.parse(evt.data));
      }
      if (!this.canvasInited) {
        return;
      }
      this.pktnum++;
      this.dbg("receive frame: " + this.pktnum);
      var frame = new Uint8Array(evt.data);
      //log("[Pkt " + this.pktnum + " (" + evt.data.byteLength + " bytes)]");
      //this.decode(frame);
      framesList.push(frame);
    };

    var shiftFrame = function() {
      if(!running)
        return;


      if(framesList.length > 10) {
        log("Dropping frames", framesList.length);
        framesList = [];
      }

      var frame = framesList.shift();

      // 以10%的概率丢掉frame
      if(frame) {
        this.decode(frame);
      }

      requestAnimationFrame(shiftFrame);
    }.bind(this);


    shiftFrame();



    this.ws.onclose = () => {
      running = false;
      log("WSAvcPlayer: Connection closed")
    };

  },

  initCanvas : function(width, height) {
    var canvasFactory = this.canvastype == "webgl" || this.canvastype == "YUVWebGLCanvas"
                        ? YUVWebGLCanvas
                        : YUVCanvas;

    var canvas = new canvasFactory(this.canvas, new Size(width, height));
    log("init canvas: " + typeof(canvasFactory));
    this.avc.onPictureDecoded = canvas.decode;
    this.emit("canvasReady", width, height);
  },

  cmd : function(cmd){
    log("Incoming request", cmd);

    if(cmd.action == "init") {
      this.initCanvas(cmd.width, cmd.height);
      this.canvas.width  = cmd.width;
      this.canvas.height = cmd.height;
    }
  },

  disconnect : function() {
    this.ws.close();
  },

  playStream : function() {
    var message = "REQUESTSTREAM ";
    this.ws.send(message);
    log("Sent " + message);
  },


  stopStream : function() {
    this.ws.send("STOPSTREAM");
    log("Sent STOPSTREAM");
  },
});


module.exports = WSAvcPlayer;
module.exports.debug = debug;
