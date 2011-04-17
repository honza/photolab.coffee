###
Photolab.coffee

Photolab is a photo organization and sorting tool.
###

# Imports
http = require 'http'
url = require 'url'
path = require 'path'
express = require 'express'
fs = require 'fs'
im = require 'imagemagick'
mustache = require './lib/mustache'

app = module.exports = express.createServer()

app.configure () ->
  app.set 'views', "#{__dirname}/views"
  app.set 'view engine', 'jade'
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use express.cookieParser()
  app.use express.session secret: "+N3,6.By4(S"
  app.use app.router
  app.use express.static("#{__dirname}/public")
  return

app.configure 'development', () ->
  app.use express.errorHandler(dumpExceptions: true, showStack: true)

# Global variables
CWD = process.cwd()
ROOT = '/Users/norex/Pictures/20110408'
TEMP = path.join ROOT, 'tmp'
resizer = null

# Template files
INDEX = fs.readFileSync path.join(CWD, 'templates/index.html'), 'utf-8'
IMAGE = fs.readFileSync path.join(CWD, 'templates/image.html'), 'utf-8'
PLUS = fs.readFileSync path.join(CWD, 'static/plus.png')
CLOSE = fs.readFileSync path.join(CWD, 'static/close.png')

if not path.existsSync TEMP
    fs.mkdirSync TEMP, 0666

# Remove everything but .jpg files
removeJunk = (list) ->
  result = []
  for item in list
    ext = item.substr((item.length - 4), 4)
    if ext is '.jpg' or ext is '.JPG'
      result.push item
  return result

###
Resizer class

This class handles synchronous resizing of images. If too many images are
being resized at once, it tends to lock up the OS.

TODO: Implement a throttled version - three images being process at once
###

class Resizer
  constructor: (@list) ->
    @working = false
    @queue = 0
    @qs = 3 # queue size
    @progress = 0
    @initial = @list.length
    @done = false
    console.log @list.length

  make: () ->
    if @done
      return

    if @queue is @qs
      @make()

    else
      @queue++
      pic = @list[0]
      console.log "Processing #{pic}"
      orig = path.join ROOT, pic
      dest = path.join TEMP, pic
      that = @
      im.resize
        srcPath: orig
        dstPath: dest
        width: 800,
        (err, stdout, stderr) ->
            console.log 'res callback'
            if not err
              that.working = false
              console.log that.list
              if that.list.length != 0
                that.queue--
                that.list.splice 0, 1
                now = that.initial - that.list.length
                one = that.initial/100
                p = now/one
                p = Math.round(p)
                that.progress = p

                console.log "#{pic} was resized"
                that.make()
                return
              else
                console.log 'before done'
                @done = true
                return

processPictures = () ->
    pictures = fs.readdirSync ROOT
    ps = (p for p in pictures when p != 'tmp')
    ps = (p for p in ps when p != '.DS_Store')
    console.log ps
    resizer = new Resizer ps
    resizer.make()

# Routes

app.get '/', (req, res) ->
  pictures = fs.readdirSync TEMP
  pictures = removeJunk pictures
  if pictures.length is 0
    pictures = fs.readdirSync ROOT
    pictures = removeJunk pictures
    console.log pictures
    res.render 'no-pictures',
      pictures: pictures
  else
    res.render 'home',
      pictures: pictures

app.get '/progress', (req, res) ->
  if resizer
    res.send resizer.progress.toString()
  else
    res.send '0'

app.get '/process', (req, res) ->
  pictures = fs.readdirSync ROOT
  pictures = removeJunk pictures
  resizer = new Resizer pictures
  resizer.make()
  res.send(200)

app.get '/image/*.jpg', (req, res) ->
  image = req.params[0] + '.jpg'
  p = path.join TEMP, image
  res.contentType p
  f = fs.readFileSync p
  res.end f



if not module.parent
  app.listen 8000
  console.log "Server running..."

