Photolab.coffee
===============

Photolab is a photo organization and sorting tool.

Very often, I find myself importing a few hundred pictures from my camera
into a directory like this:

    20110423

All the files in that directory have the default filenames given by the
camera. Now I need to sort through all the files, ditch the ones that are
obviously bad, and copy them over to a new directory, rename them to
something more useful.

What Photolab will do for you is the following. You run it like so:

    $ coffee photolab.coffee /path/to/your/directory

It will scan the directory for any `.jpg` files and show you a list. It will
ask you if you'd like to proceed. It will then make 800x533 thumbnails for
your in a `tmp` directory inside your main directory. When the thumbnails are
ready, you will be presented with a long HTML page with a list of images. For
each image, you can click (+) or (x) to either keep it or discard it. When
you're done, you can click the Process me button. Photolab will then take
your selection and copy the high resolution files into a `done` directory.

**IMPORTANT**: Photolab will never alter your original files.

### Dependencies

* Node.js
* npm
* npm install expres
* npm install jade
* npm install imagemagick

