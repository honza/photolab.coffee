# Photolab.coffee
# ===============
#
# Photolab is a photo organization and sorting tool.
#
# Very often, I find myself importing a few hundred pictures from my camera
# into a directory like this:
#
#     20110423
#
# All the files in that directory have the default filenames given by the
# camera. Now I need to sort through all the files, ditch the ones that are
# obviously bad, and copy them over to a new directory, rename them to
# something more useful.
#
# What Photolab will do for you is the following. You run it like so:
#
#     $ coffee photolab.coffee /path/to/your/directory
#
# It will scan the directory for any `.jpg` files and show you a list. It will
# ask you if you'd like to proceed. It will then make 800x533 thumbnails for
# your in a `tmp` directory inside your main directory. When the thumbnails are
# ready, you will be presented with a long HTML page with a list of images. For
# each image, you can click (+) or (x) to either keep it or discard it. When
# you're done, you can click the Process me button. Photolab will then take
# your selection and copy the high resolution files into a `done` directory.
#
# **IMPORTANT**: Photolab will never alter your original files.
#
# ### Dependencies
#
# * Node.js
# * npm
# * npm install -g coffee-script
# * npm install express
# * npm install jade
# * npm install imagemagick

# Node.js imports
http = require 'http'
url = require 'url'
path = require 'path'
express = require 'express'
fs = require 'fs'
exec = require('child_process').exec
im = require 'imagemagick'

# Create an Express server
app = module.exports = express.createServer()

# Configure express server
# We're using Jade templates.

app.configure () ->
  app.set 'views', "#{__dirname}/views"
  app.set 'view engine', 'jade'
  app.use express.bodyParser()
  app.use express.methodOverride()
  app.use app.router
  app.use express.static("#{__dirname}/public")
  return

console.log __dirname

app.configure 'development', () ->
  app.use express.errorHandler(dumpExceptions: true, showStack: true)

# Global variables

CWD = process.cwd()
ROOT = process.argv[2]
TEMP = path.join ROOT, 'tmp'
resizer = null

# Check if the `tmp` directory is present, if not, create it.

if not path.existsSync TEMP
  fs.mkdirSync TEMP, 16877

# Remove everything but .jpg files from `list` and return an array

removeJunk = (list) ->
  result = []
  for item in list
    ext = item.substr((item.length - 4), 4)
    if ext is '.jpg' or ext is '.JPG'
      result.push item
  return result

# Resizer class

# This class handles synchronous resizing of images. If too many images are
# being resized at once, it tends to lock up the OS.

class Resizer
  constructor: (@list) ->
    @working = false
    @queue = 0
    @qs = 3 # queue size
    @progress = 0
    @initial = @list.length
    @done = false

  make: () ->
    if @done
      return

    if @queue is @qs
      @make()

    else
      @queue++
      pic = @list[0]
      orig = path.join ROOT, pic
      dest = path.join TEMP, pic
      that = @
      im.resize
        srcPath: orig
        dstPath: dest
        width: 800,
        (err, stdout, stderr) ->
            if not err
              that.working = false
              if that.list.length != 0
                that.queue--
                that.list.splice 0, 1
                now = that.initial - that.list.length
                one = that.initial/100
                p = now/one
                p = Math.round(p)
                that.progress = p

                that.make()
                return
              else
                @done = true
                return

processPictures = () ->
    pictures = fs.readdirSync ROOT
    ps = (p for p in pictures when p != 'tmp')
    ps = (p for p in ps when p != '.DS_Store')
    resizer = new Resizer ps
    resizer.make()

# ### Routes

# Home route
#
# Either a page listing the files present in the root directory
# or a list of images

app.get '/', (req, res) ->
  pictures = fs.readdirSync TEMP
  pictures = removeJunk pictures
  if pictures.length is 0
    pictures = fs.readdirSync ROOT
    pictures = removeJunk pictures
    res.render 'no-pictures',
      pictures: pictures
      process: false
  else
    res.render 'home',
      pictures: pictures
      process: true

# Progress
#
# This is used by ajax calls from the client to see how we're doing in terms of
# resizing the images

app.get '/progress', (req, res) ->
  if resizer
    res.send resizer.progress.toString()
  else
    res.send '0'

# Process image files

app.get '/process', (req, res) ->
  pictures = fs.readdirSync ROOT
  pictures = removeJunk pictures
  resizer = new Resizer pictures
  resizer.make()
  res.send(200)

# Copy files from root to done

app.post '/create-final', (req, res) ->
  pics = req.body.pictures
  done = path.join ROOT, 'done/'
  if not path.existsSync(done)
    fs.mkdirSync done, 16877
  for pic in pics
    exec "cd #{ROOT} && cp #{pic} done/.", (e, out, err) ->
  res.send(200)

# Serve JPEG files from root

app.get '/image/*.jpg', (req, res) ->
  image = req.params[0] + '.jpg'
  p = path.join TEMP, image
  res.contentType p
  f = fs.readFileSync p
  res.end f

# Start the engines

if not module.parent
  app.listen 8000
  console.log "Server running..."

