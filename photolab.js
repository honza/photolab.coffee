(function() {
  var CWD, ROOT, Resizer, TEMP, app, exec, express, fs, http, im, mustache, path, processPictures, removeJunk, resizer, url;
  http = require('http');
  url = require('url');
  path = require('path');
  express = require('express');
  fs = require('fs');
  exec = require('child_process').exec;
  im = require('imagemagick');
  mustache = require('./lib/mustache');
  app = module.exports = express.createServer();
  app.configure(function() {
    app.set('views', "" + __dirname + "/views");
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static("" + __dirname + "/public"));
  });
  app.configure('development', function() {
    return app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
  });
  CWD = process.cwd();
  ROOT = process.argv[2];
  TEMP = path.join(ROOT, 'tmp');
  resizer = null;
  if (!path.existsSync(TEMP)) {
    fs.mkdirSync(TEMP, 16877);
  }
  removeJunk = function(list) {
    var ext, item, result, _i, _len;
    result = [];
    for (_i = 0, _len = list.length; _i < _len; _i++) {
      item = list[_i];
      ext = item.substr(item.length - 4, 4);
      if (ext === '.jpg' || ext === '.JPG') {
        result.push(item);
      }
    }
    return result;
  };
  Resizer = (function() {
    function Resizer(list) {
      this.list = list;
      this.working = false;
      this.queue = 0;
      this.qs = 3;
      this.progress = 0;
      this.initial = this.list.length;
      this.done = false;
    }
    Resizer.prototype.make = function() {
      var dest, orig, pic, that;
      if (this.done) {
        return;
      }
      if (this.queue === this.qs) {
        return this.make();
      } else {
        this.queue++;
        pic = this.list[0];
        orig = path.join(ROOT, pic);
        dest = path.join(TEMP, pic);
        that = this;
        return im.resize({
          srcPath: orig,
          dstPath: dest,
          width: 800
        }, function(err, stdout, stderr) {
          var now, one, p;
          if (!err) {
            that.working = false;
            if (that.list.length !== 0) {
                            that.queue--;
              that.list.splice(0, 1);
              now = that.initial - that.list.length;
              one = that.initial / 100;
              p = now / one;
              p = Math.round(p);
              that.progress = p;
              that.make();;
            } else {
              this.done = true;
            }
          }
        });
      }
    };
    return Resizer;
  })();
  processPictures = function() {
    var p, pictures, ps;
    pictures = fs.readdirSync(ROOT);
    ps = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = pictures.length; _i < _len; _i++) {
        p = pictures[_i];
        if (p !== 'tmp') {
          _results.push(p);
        }
      }
      return _results;
    })();
    ps = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = ps.length; _i < _len; _i++) {
        p = ps[_i];
        if (p !== '.DS_Store') {
          _results.push(p);
        }
      }
      return _results;
    })();
    resizer = new Resizer(ps);
    return resizer.make();
  };
  app.get('/', function(req, res) {
    var pictures;
    pictures = fs.readdirSync(TEMP);
    pictures = removeJunk(pictures);
    if (pictures.length === 0) {
      pictures = fs.readdirSync(ROOT);
      pictures = removeJunk(pictures);
      return res.render('no-pictures', {
        pictures: pictures,
        process: false
      });
    } else {
      return res.render('home', {
        pictures: pictures,
        process: true
      });
    }
  });
  app.get('/progress', function(req, res) {
    if (resizer) {
      return res.send(resizer.progress.toString());
    } else {
      return res.send('0');
    }
  });
  app.get('/process', function(req, res) {
    var pictures;
    pictures = fs.readdirSync(ROOT);
    pictures = removeJunk(pictures);
    resizer = new Resizer(pictures);
    resizer.make();
    return res.send(200);
  });
  app.post('/create-final', function(req, res) {
    var done, pic, pics, _i, _len;
    pics = req.body.pictures;
    done = path.join(ROOT, 'done/');
    if (!path.existsSync(done)) {
      fs.mkdirSync(done, 16877);
    }
    for (_i = 0, _len = pics.length; _i < _len; _i++) {
      pic = pics[_i];
      exec("cd " + ROOT + " && cp " + pic + " done/.", function(e, out, err) {});
    }
    return res.send(200);
  });
  app.get('/image/*.jpg', function(req, res) {
    var f, image, p;
    image = req.params[0] + '.jpg';
    p = path.join(TEMP, image);
    res.contentType(p);
    f = fs.readFileSync(p);
    return res.end(f);
  });
  if (!module.parent) {
    app.listen(8000);
    console.log("Server running...");
  }
}).call(this);
