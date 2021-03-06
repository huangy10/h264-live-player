"use strict";

const util      = require('util');
const spawn     = require('child_process').spawn;
const merge     = require('mout/object/merge');

const Server    = require('./_server');


class RpiServer extends Server {

  constructor(server, opts) {
    super(server, merge({
      fps : 24,
    }, opts));
    this.get_feed = this.get_feed.bind(this);
  }

  get_feed() {
    if (this.streamer !== undefined) {
      this.streamer.kill();
    }
    var msk = "raspivid -n -t 0 -o - -w %d -h %d -fps %d";
    var cmd = util.format(msk, this.options.width, this.options.height, this.options.fps);
    console.log(cmd);
    var streamer = spawn('raspivid', ['-n', '-t', '0', '-o', '-', '-w', this.options.width, '-h', this.options.height, '-fps', this.options.fps, '-pf', 'baseline']);
    streamer.on("exit", function(code){
      if (code) {
        console.log("Failure", code);
      }
    });
    this.streamer = streamer;
    return streamer.stdout;
  }

};



module.exports = RpiServer;
