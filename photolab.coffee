###
Photolab.coffee

Photolab is a photo organization and sorting tool.
###

# Imports
http = require 'http'
url = require 'url'
path = require 'path'
fs = require 'fs'
im = require 'imagemagick'
mustache = require './lib/mustache'

# Global variables
CWD = process.cwd()
ROOT = '/Users/norex/Pictures/20110408'
TEMP = path.join ROOT, 'tmp'

# Template files
INDEX = fs.readFileSync path.join(CWD, 'templates/index.html'), 'utf-8'
IMAGE = fs.readFileSync path.join(CWD, 'templates/image.html'), 'utf-8'
PLUS = fs.readFileSync path.join(CWD, 'static/plus.png')
CLOSE = fs.readFileSync path.join(CWD, 'static/close.png')

resizer = null

if not path.existsSync TEMP
    fs.mkdirSync TEMP, 0666

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

getIndex = (content, head) ->
    result = mustache.Mustache.to_html INDEX,
        content: content
        head: head
    result


class Responder
    constructor: (@req, @res) ->

    respond: (content, type) ->
        @res.writeHead 200,
            'Content-Type': type
        @res.end content

    say: (content) ->
        @respond content, 'text/html'

    script: (content) ->
        @respond content, 'text/javascript'

    style: (content) ->
        @respond content, 'text/css'

    img: (content) ->
        @respond content, 'image/jpeg'

    png: (content) ->
        @respond content, 'image/png'

    text: (content) ->
        @respond content, 'text/plain'


class Router
    constructor: (@responder) ->

    home: () ->
        pictures = fs.readdirSync TEMP

        # If there are no pictures in the temporary directory, let's process
        # the ones from the ROOT directory and put them there
        if pictures.length is 0
            big_pictures = fs.readdirSync ROOT
            content = """
            <div id="empty">
            <p>The current directory</p>
            <p><strong>#{ROOT}</strong></p>
            <p>has the following pictures.</p>
            """
            for pic in big_pictures
                if pic is 'tmp'
                    continue
                if pic is '.DS_Store'
                    continue
                content += "#{pic}<br>"
            content += """
            <p>Would you like me to process them?</p>
            <p><a href="#" class="button" rel="process">Yes</a></p>
            </div>
            """
            index = getIndex content, ''
            @responder.say index
            return
            #processPictures()

        html = ""

        for picture in pictures
            id = picture.substr(0, picture.length-4)
            img = mustache.Mustache.to_html IMAGE,
                id: id
                picture: picture
            html += img

        head = "<script type='text/javascript'>var images = ["
        for pic in pictures
            head += "'#{pic}', "
        head += "]</script>"

        content = getIndex html, head
        @responder.say content

    script: () ->
        that = @
        fs.readFile 'static/script.js', 'binary', (e, file) ->
            if not e
                that.responder.script file
            else
                console.log 'error'

    style: () ->
        that = @
        fs.readFile 'static/style.css', 'binary', (e, file) ->
            if not e
                that.responder.style file
            else
                console.log 'error'

    img: (f) ->
        f = f.substr 1
        f = path.join TEMP, f
        that = @
        if not path.existsSync(f)
            console.log 'got nothing'
            return
        fs.readFile f, (e, file) ->
            if not e
                that.responder.img file
            else
                console.log 'read error'

    icon: (f) ->
        if f is 'plus'
            @responder.png PLUS
        else
            @responder.png CLOSE

    progress: () ->
        if resizer
            @responder.text resizer.progress.toString()
        else
            @responder.text "0"

    process: () ->
        processPictures()
        @responder.text 'ok'


server = http.createServer (req, res) ->

    u = url.parse req.url
    u = u.pathname

    r = new Responder req, res

    router = new Router r

    switch u
        when '/' then router.home()
        when '/progress' then router.progress()
        when '/process' then router.process()
        when '/favicon.ico' then console.log('fav')
        when '/plus.png' then router.icon('plus')
        when '/close.png' then router.icon('close')
        else 
            if path.extname(u) is '.jpg'
                router.img u
    

# Start the server
server.listen 8000, '127.0.0.1'
console.log "Server is running..."
