(function() {
  /*
  Photolab.coffee

  Photolab is a photo organization and sorting tool.
  */  var CLOSE, CWD, IMAGE, INDEX, PLUS, ROOT, Resizer, Responder, Router, TEMP, fs, getIndex, http, im, mustache, path, processPictures, resizer, server, url;
  http = require('http');
  url = require('url');
  path = require('path');
  fs = require('fs');
  im = require('imagemagick');
  mustache = require('./lib/mustache');
  CWD = process.cwd();
  ROOT = '/Users/norex/Pictures/20110408';
  TEMP = path.join(ROOT, 'tmp');
  INDEX = fs.readFileSync(path.join(CWD, 'templates/index.html'), 'utf-8');
  IMAGE = fs.readFileSync(path.join(CWD, 'templates/image.html'), 'utf-8');
  PLUS = fs.readFileSync(path.join(CWD, 'static/plus.png'));
  CLOSE = fs.readFileSync(path.join(CWD, 'static/close.png'));
  resizer = null;
  if (!path.existsSync(TEMP)) {
    fs.mkdirSync(TEMP, 0666);
  }
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
        im.resize({
          srcPath: orig,
          dstPath: dest,
          width: 800
        }, function(err, stdout, stderr) {
          var now, one, p;
          console.log('res callback');
          console.log(err);
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
        return this.make();
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
  getIndex = function(content, head) {
    var result;
    result = mustache.Mustache.to_html(INDEX, {
      content: content,
      head: head
    });
    return result;
  };
  Responder = (function() {
    function Responder(req, res) {
      this.req = req;
      this.res = res;
    }
    Responder.prototype.respond = function(content, type) {
      this.res.writeHead(200, {
        'Content-Type': type
      });
      return this.res.end(content);
    };
    Responder.prototype.say = function(content) {
      return this.respond(content, 'text/html');
    };
    Responder.prototype.script = function(content) {
      return this.respond(content, 'text/javascript');
    };
    Responder.prototype.style = function(content) {
      return this.respond(content, 'text/css');
    };
    Responder.prototype.img = function(content) {
      return this.respond(content, 'image/jpeg');
    };
    Responder.prototype.png = function(content) {
      return this.respond(content, 'image/png');
    };
    Responder.prototype.text = function(content) {
      return this.respond(content, 'text/plain');
    };
    return Responder;
  })();
  Router = (function() {
    function Router(responder) {
      this.responder = responder;
    }
    Router.prototype.home = function() {
      var big_pictures, content, head, html, id, img, index, pic, picture, pictures, _i, _j, _k, _len, _len2, _len3;
      pictures = fs.readdirSync(TEMP);
      if (pictures.length === 0) {
        big_pictures = fs.readdirSync(ROOT);
        content = "<div id=\"empty\">\n<p>The current directory</p>\n<p><strong>" + ROOT + "</strong></p>\n<p>has the following pictures.</p>";
        for (_i = 0, _len = big_pictures.length; _i < _len; _i++) {
          pic = big_pictures[_i];
          if (pic === 'tmp') {
            continue;
          }
          if (pic === '.DS_Store') {
            continue;
          }
          content += "" + pic + "<br>";
        }
        content += "<p>Would you like me to process them?</p>\n<p><a href=\"#\" class=\"button\" rel=\"process\">Yes</a></p>\n</div>";
        index = getIndex(content, '');
        this.responder.say(index);
        return;
      }
      html = "";
      for (_j = 0, _len2 = pictures.length; _j < _len2; _j++) {
        picture = pictures[_j];
        id = picture.substr(0, picture.length - 4);
        img = mustache.Mustache.to_html(IMAGE, {
          id: id,
          picture: picture
        });
        html += img;
      }
      head = "<script type='text/javascript'>var images = [";
      for (_k = 0, _len3 = pictures.length; _k < _len3; _k++) {
        pic = pictures[_k];
        head += "'" + pic + "', ";
      }
      head += "]</script>";
      content = getIndex(html, head);
      return this.responder.say(content);
    };
    Router.prototype.script = function() {
      var that;
      that = this;
      return fs.readFile('static/script.js', 'binary', function(e, file) {
        if (!e) {
          return that.responder.script(file);
        } else {
          return console.log('error');
        }
      });
    };
    Router.prototype.style = function() {
      var that;
      that = this;
      return fs.readFile('static/style.css', 'binary', function(e, file) {
        if (!e) {
          return that.responder.style(file);
        } else {
          return console.log('error');
        }
      });
    };
    Router.prototype.img = function(f) {
      var that;
      f = f.substr(1);
      f = path.join(TEMP, f);
      that = this;
      if (!path.existsSync(f)) {
        console.log('got nothing');
        return;
      }
      return fs.readFile(f, function(e, file) {
        if (!e) {
          return that.responder.img(file);
        } else {
          return console.log('read error');
        }
      });
    };
    Router.prototype.icon = function(f) {
      if (f === 'plus') {
        return this.responder.png(PLUS);
      } else {
        return this.responder.png(CLOSE);
      }
    };
    Router.prototype.progress = function() {
      if (resizer) {
        return this.responder.text(resizer.progress.toString());
      } else {
        return this.responder.text("0");
      }
    };
    Router.prototype.process = function() {
      processPictures();
      return this.responder.text('ok');
    };
    return Router;
  })();
  server = http.createServer(function(req, res) {
    var r, router, u;
    u = url.parse(req.url);
    u = u.pathname;
    r = new Responder(req, res);
    router = new Router(r);
    switch (u) {
      case '/':
        return router.home();
      case '/progress':
        return router.progress();
      case '/process':
        return router.process();
      case '/script.js':
        return router.script();
      case '/style.css':
        return router.style();
      case '/favicon.ico':
        return console.log('fav');
      case '/plus.png':
        return router.icon('plus');
      case '/close.png':
        return router.icon('close');
      default:
        if (path.extname(u) === '.jpg') {
          return router.img(u);
        }
    }
  });
  server.listen(8000, '127.0.0.1');
  console.log("Server is running...");
}).call(this);
