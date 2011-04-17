(function($) {

  var _pics, populatePictures, removeItem;
  var pictures = [];

  populatePictures = function() {
    _pics = $('.image img');
    if (_pics.length > 0) {
      _pics.each(function(i, item) {
        pictures.push($(item).attr('id'));
      });
    }
  };

  removeItem = function(arr, item) {
    return $.grep(arr, function(value) {
      return value != item;
    });
  };

  $(function () {

    populatePictures();

    $('.discard').click(function () {
      var box = $(this).parent().parent();
      var id = box.find('.image img').attr('id');
      if (box.hasClass('keeper')) {
        box.removeClass('keeper');
      } else {
        box.fadeOut();
        pictures = removeItem(pictures, id);
      }
      return false;
    });

    $('.keep').click(function () {
      var box = $(this).parent().parent();
      var id = box.find('.image img').attr('id');
      box.addClass('keeper');
      return false;
    });

    $('#process-btn').click(function() {
      $.post('/create-final', {pictures: pictures}, function() {
        console.log('All done');
      });
      return false;
    });

    $('#proceed').click(function() {

      $.get('/process', null, function(r) {

        $('#empty').fadeOut('fast', function() {
          $('#empty').remove();
          $('#wrap').append("<div id='progress-div'>" +
          "<span id='progress'>0</span>%<br>" +
          "<div id='progress-container'>" +
          "<div id='progress-bar' style='width:0px'></div>" +
          "</div></div>");
          setInterval(function() {
            $.get('/progress', null, function(r) {
              console.log(r);
              if (r === '100') {
                window.location.reload();
                return;
              }
              $('#progress').text(r);
              $('#progress-bar').css('width', r);
            });
          }, 1000); // interval
        }); // fadeOUt
      }); // get
      return false;
    });

  });

})(jQuery);
