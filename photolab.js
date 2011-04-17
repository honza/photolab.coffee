(function() {
  /*
  Photolab.coffee

  Photolab is a photo organization and sorting tool.
  */  var CLOSE, CWD, IMAGE, INDEX, PLUS, ROOT, Resizer, TEMP, app, express, fs, http, im, mustache, path, processPictures, removeJunk, resizer, url;
  http = require('http');
  url = require('url');
  path = require('path');
  express = require('express');
  fs = require('fs');
  im = require('imagemagick');
  mustache = require('./lib/mustache');
  app = module.exports = express.createServer();
  app.configure(function() {
    app.set('views', "" + __dirname + "/views");
    app.set('view engine', 'jade');
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.cookieParser());
    app.use(express.session({
      secret: "+N3,6.By4(S"
    }));
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
  ROOT = '/Users/norex/Pictures/20110408';
  TEMP = path.join(ROOT, 'tmp');
  resizer = null;
  INDEX = fs.readFileSync(path.join(CWD, 'templates/index.html'), 'utf-8');
  IMAGE = fs.readFileSync(path.join(CWD, 'templates/image.html'), 'utf-8');
  PLUS = fs.readFileSync(path.join(CWD, 'static/plus.png'));
  CLOSE = fs.readFileSync(path.join(CWD, 'static/close.png'));
  if (!path.existsSync(TEMP)) {
    fs.mkdirSync(TEMP, 0666);
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
  /*
  Resizer class

  This class handles synchronous resizing of images. If too many images are
  being resized at once, it tends to lock up the OS.

  TODO: Implement a throttled version - three images being process at once
  */
  Resizer = (function() {
    function Resizer(list) {
      this.list = list;
      this.working = false;
      this.queue = 0;
      this.qs = 3;
      this.progress = 0;
      this.initial = this.list.length;
      this.done = false;
      console.log(this.list.length);
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
        console.log("Processing " + pic);
        orig = path.join(ROOT, pic);
        dest = path.join(TEMP, pic);
        that = this;
        return im.resize({
          srcPath: orig,
          dstPath: dest,
          width: 800
        }, function(err, stdout, stderr) {
          var now, one, p;
          console.log('res callback');
          if (!err) {
            that.working = false;
            console.log(that.list);
            if (that.list.length !== 0) {
                            that.queue--;
              that.list.splice(0, 1);
              now = that.initial - that.list.length;
              one = that.initial / 100;
              p = now / one;
              p = Math.round(p);
              that.progress = p;
              console.log("" + pic + " was resized");
              that.make();;
            } else {
                            console.log('before done');
              this.done = true;;
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
    console.log(ps);
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
      console.log(pictures);
      return res.render('no-pictures', {
        pictures: pictures
      });
    } else {
      return res.render('home', {
        pictures: pictures
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
