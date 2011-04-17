$(function () {
  var p;

  $('.discard').click(function () {
    var id = $(this).attr('rel');
    $('#' + id + "-image").fadeOut('normal', function() {
      $(this).hide();
    });
    images.pop(id);
    return false;
  });

  $('#proceed').click(function() {

    $.get('/process', null, function(r){

      $('#empty').fadeOut('fast', function() {
        $('#empty').remove();
        $('#wrap').append("<div id='progress-div'>" +
        "<span id='progress'>0</span>%<br>" +
        "<div id='progress-container'>" +
        "<div id='progress-bar' style='width:0px'></div>" +
        "</div></div>");
        p = setInterval(function() {
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
